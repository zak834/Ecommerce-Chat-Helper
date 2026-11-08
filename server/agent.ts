// 从 LangChain 生态导入所需模块
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai" // 用于通过 Gemini 从文本创建向量嵌入
import { ChatGoogleGenerativeAI } from "@langchain/google-genai" // Google 的 Gemini AI 模型
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages" // 对话消息类型
import {
  ChatPromptTemplate,      // 用于创建带占位符的结构化提示词
  MessagesPlaceholder,     // 动态消息历史的占位符
} from "@langchain/core/prompts"
import { StateGraph } from "@langchain/langgraph"              // 基于状态的工作流编排
import { Annotation } from "@langchain/langgraph"              // 用于状态管理的类型注解
import { tool } from "@langchain/core/tools"                   // 用于创建自定义工具/函数
import { ToolNode } from "@langchain/langgraph/prebuilt"       // 用于执行工具的预构建节点
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb" // 用于保存对话状态
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"   // MongoDB 向量搜索集成
import { MongoClient } from "mongodb"                          // MongoDB 数据库客户端
import { z } from "zod"                                        // 模式校验库
import "dotenv/config"                                         // 从 .env 文件加载环境变量

// 使用指数退避策略处理 API 速率限制的工具函数
async function retryWithBackoff<T>(
  fn: () => Promise<T>,    // 需要重试的函数（泛型 T 表示返回值类型）
  maxRetries = 3           // 最大重试次数（默认 3 次）
): Promise<T> {
  // 循环执行重试尝试
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()    // 尝试执行函数
    } catch (error: any) {
      // 判断是否为速率限制错误（HTTP 429）且还有剩余重试次数
      if (error.status === 429 && attempt < maxRetries) {
        // 计算指数退避延迟：2^attempt 秒，最长 30 秒
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
        console.log(`Rate limit hit. Retrying in ${delay/1000} seconds...`)
        // 等待计算出的延迟时间后再重试
        await new Promise(resolve => setTimeout(resolve, delay))
        continue // 进入下一次迭代（重试）
      }
      throw error // 如果不是速率限制错误或重试次数已用完，则抛出错误
    }
  }
  throw new Error("Max retries exceeded") // 理论上永远不会执行到这里
}

// 创建并运行 AI 智能体的主函数
export async function callAgent(client: MongoClient, query: string, thread_id: string) {
  try {
    // 数据库配置
    const dbName = "inventory_database"        // MongoDB 数据库名称
    const db = client.db(dbName)              // 获取数据库实例
    const collection = db.collection("items") // 获取 'items' 集合

    // 定义智能体工作流的状态结构
    const GraphState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        // 归约函数：定义如何合并新旧消息
        reducer: (x, y) => x.concat(y), // 简单地将旧消息（x）与新消息（y）拼接
      }),
    })

    // 创建一个用于搜索家具库存的自定义工具
    const itemLookupTool = tool(
      // 工具被调用时实际执行的函数
      async ({ query, n = 10 }) => {
        try {
          console.log("Item lookup tool called with query:", query)

          // 检查数据库中是否完全没有任何数据
          const totalCount = await collection.countDocuments()
          console.log(`Total documents in collection: ${totalCount}`)

          // 如果数据库为空则提前返回
          if (totalCount === 0) {
            console.log("Collection is empty")
            return JSON.stringify({ 
              error: "No items found in inventory", 
              message: "The inventory database appears to be empty",
              count: 0 
            })
          }

          // 获取示例文档用于调试
          const sampleDocs = await collection.find({}).limit(3).toArray()
          console.log("Sample documents:", sampleDocs)

          // MongoDB Atlas 向量搜索的配置
          const dbConfig = {
            collection: collection,           // 要搜索的 MongoDB 集合
            indexName: "vector_index",       // 向量搜索索引的名称
            textKey: "embedding_text",       // 存储用于生成嵌入的文本的字段
            embeddingKey: "embedding",       // 存储向量嵌入的字段
          }

          // 使用 Google Gemini 嵌入创建向量存储实例，用于语义搜索
          const vectorStore = new MongoDBAtlasVectorSearch(
            new GoogleGenerativeAIEmbeddings({
              apiKey: process.env.GOOGLE_API_KEY, // 从环境变量获取 Google API 密钥
              model: "text-embedding-004",         // Gemini 嵌入模型
            }),
            dbConfig
          )

          console.log("Performing vector search...")
          // 使用向量嵌入执行语义搜索
          const result = await vectorStore.similaritySearchWithScore(query, n)
          console.log(`Vector search returned ${result.length} results`)
          
          // 如果向量搜索没有返回结果，则回退到文本搜索
          if (result.length === 0) {
            console.log("Vector search returned no results, trying text search...")
            // 使用正则表达式进行 MongoDB 文本搜索
            const textResults = await collection.find({
              $or: [ // OR 条件 — 匹配以下任意一个字段
                { item_name: { $regex: query, $options: 'i' } },        // 在商品名称中不区分大小写搜索
                { item_description: { $regex: query, $options: 'i' } }, // 在商品描述中不区分大小写搜索
                { categories: { $regex: query, $options: 'i' } },       // 在分类中不区分大小写搜索
                { embedding_text: { $regex: query, $options: 'i' } }    // 在嵌入文本中不区分大小写搜索
              ]
            }).limit(n).toArray() // 限制结果数量并转换为数组
            
            console.log(`Text search returned ${textResults.length} results`)
            // 将文本搜索结果以 JSON 字符串形式返回
            return JSON.stringify({
              results: textResults,
              searchType: "text",    // 标明这是一次文本搜索
              query: query,
              count: textResults.length
            })
          }

          // 将向量搜索结果以 JSON 字符串形式返回
          return JSON.stringify({
            results: result,
            searchType: "vector",   // 标明这是一次向量搜索
            query: query,
            count: result.length
          })
          
        } catch (error: any) {
          // 输出详细的错误信息以便调试
          console.error("Error in item lookup:", error)
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
          })
          
          // 将错误信息以 JSON 字符串形式返回
          return JSON.stringify({ 
            error: "Failed to search inventory", 
            details: error.message,
            query: query
          })
        }
      },
      // 工具元数据与模式定义
      {
        name: "item_lookup",                                    // AI 将引用的工具名称
        description: "Gathers furniture item details from the Inventory database", // 供 AI 参考的工具描述
        schema: z.object({                                      // 输入校验模式
          query: z.string().describe("The search query"),      // 必需的字符串参数
          n: z.number().optional().default(10)                 // 可选的数字参数，带默认值
            .describe("Number of results to return"),
        }),
      }
    )

    // 所有可用工具的数组（本例中只有一个）
    const tools = [itemLookupTool]
    // 为工作流创建工具执行节点
    const toolNode = new ToolNode<typeof GraphState.State>(tools)

    // 初始化 AI 模型（Google 的 Gemini）
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",         // 使用 Gemini 1.5 Flash 模型
      temperature: 0,                    // 确定性回复（无随机性）
      maxRetries: 0,                     // 禁用内置重试（由我们自行处理）
      apiKey: process.env.GOOGLE_API_KEY, // 从环境变量获取 Google API 密钥
    }).bindTools(tools)                  // 将自定义工具绑定到模型

    // 决策函数：确定工作流的下一步
    function shouldContinue(state: typeof GraphState.State) {
      const messages = state.messages                               // 获取所有消息
      const lastMessage = messages[messages.length - 1] as AIMessage // 获取最近的一条消息

      // 如果 AI 想使用工具，则前往工具节点；否则结束
      if (lastMessage.tool_calls?.length) {
        return "tools"  // 路由到工具执行节点
      }
      return "__end__"  // 结束工作流
    }

    // 带重试逻辑调用 AI 模型的函数
    async function callModel(state: typeof GraphState.State) {
      return retryWithBackoff(async () => { // 包裹在重试逻辑中
        // 创建结构化的提示词模板
        const prompt = ChatPromptTemplate.fromMessages([
          [
            "system", // 系统消息定义 AI 的角色和行为
            `You are a helpful E-commerce Chatbot Agent for a furniture store. 

IMPORTANT: You have access to an item_lookup tool that searches the furniture inventory database. ALWAYS use this tool when customers ask about furniture items, even if the tool returns errors or empty results.

When using the item_lookup tool:
- If it returns results, provide helpful details about the furniture items
- If it returns an error or no results, acknowledge this and offer to help in other ways
- If the database appears to be empty, let the customer know that inventory might be being updated

Current time: {time}`,
          ],
          new MessagesPlaceholder("messages"), // 对话历史的占位符
        ])

        // 用实际值填充提示词模板
        const formattedPrompt = await prompt.formatMessages({
          time: new Date().toISOString(), // 当前时间戳
          messages: state.messages,       // 所有历史消息
        })

        // 使用格式化后的提示词调用 AI 模型
        const result = await model.invoke(formattedPrompt)
        // 返回添加了 AI 回复的新状态
        return { messages: [result] }
      })
    }

    // 构建工作流图
    const workflow = new StateGraph(GraphState)
      .addNode("agent", callModel)                    // 添加 AI 模型节点
      .addNode("tools", toolNode)                     // 添加工具执行节点
      .addEdge("__start__", "agent")                  // 工作流从 agent 节点开始
      .addConditionalEdges("agent", shouldContinue)   // 由 agent 决定：去 tools 还是结束
      .addEdge("tools", "agent")                      // 工具执行后返回 agent 节点

    // 初始化对话状态持久化
    const checkpointer = new MongoDBSaver({ client, dbName })
    // 编译带有状态保存功能的工作流
    const app = workflow.compile({ checkpointer })

    // 执行工作流
    const finalState = await app.invoke(
      {
        messages: [new HumanMessage(query)], // 以用户的问题开始
      },
      { 
        recursionLimit: 15,                   // 防止无限循环
        configurable: { thread_id: thread_id } // 对话线程标识符
      }
    )

    // 从对话中提取最终回复
    const response = finalState.messages[finalState.messages.length - 1].content
    console.log("Agent response:", response)

    return response // 返回 AI 的最终回复

  } catch (error: any) {
    // 针对不同类型的错误给出用户友好的提示信息
    console.error("Error in callAgent:", error.message)
    
    if (error.status === 429) { // 速率限制错误
      throw new Error("Service temporarily unavailable due to rate limits. Please try again in a minute.")
    } else if (error.status === 401) { // 认证错误
      throw new Error("Authentication failed. Please check your API configuration.")
    } else { // 通用错误
      throw new Error(`Agent failed: ${error.message}`)
    }
  }
}
