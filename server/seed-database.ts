// 导入 Google 的 Gemini 聊天模型和嵌入模型，用于 AI 文本生成和向量创建
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
// 导入结构化输出解析器，确保 AI 按特定格式返回数据
import { StructuredOutputParser } from "@langchain/core/output_parsers"
// 导入 MongoDB 客户端用于数据库连接
import { MongoClient } from "mongodb"
// 导入 MongoDB Atlas 向量搜索，用于存储和检索嵌入向量
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
// 导入 Zod 用于数据模式校验和类型安全
import { z } from "zod"
// 从 .env 文件加载环境变量（API 密钥、连接字符串）
import "dotenv/config"

// 使用环境变量中的连接字符串创建 MongoDB 客户端实例
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// 初始化 Google Gemini 聊天模型，用于生成合成家具数据
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",  // 使用 Gemini 1.5 Flash 模型
  temperature: 0.7,               // 设置创造性水平（0.7 = 中等创造性）
  apiKey: process.env.GOOGLE_API_KEY, // 从环境变量获取 Google API 密钥
})

// 使用 Zod 校验定义家具商品结构的模式
const itemSchema = z.object({
  item_id: z.string(),                    // 商品的唯一标识符
  item_name: z.string(),                  // 家具商品名称
  item_description: z.string(),           // 商品的详细描述
  brand: z.string(),                      // 品牌/制造商名称
  manufacturer_address: z.object({        // 嵌套对象：制造商地址
    street: z.string(),                   // 街道地址
    city: z.string(),                     // 城市名称
    state: z.string(),                    // 州/省份
    postal_code: z.string(),              // 邮政编码
    country: z.string(),                  // 国家名称
  }),
  prices: z.object({                      // 嵌套对象：价格信息
    full_price: z.number(),               // 正常价格
    sale_price: z.number(),               // 折扣价
  }),
  categories: z.array(z.string()),        // 分类标签数组
  user_reviews: z.array(                  // 用户评价数组
    z.object({
      review_date: z.string(),            // 评价日期
      rating: z.number(),                 // 评分（1-5）
      comment: z.string(),                // 评价文字内容
    })
  ),
  notes: z.string(),                      // 商品附加说明
})

// 从 Zod 模式创建 TypeScript 类型以保证类型安全
type Item = z.infer<typeof itemSchema>

// 创建解析器，确保 AI 输出符合我们的商品模式
const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema))

// 在填充数据前创建数据库和集合的函数
async function setupDatabaseAndCollection(): Promise<void> {
  console.log("Setting up database and collection...")
  
  // 获取 inventory_database 数据库的引用
  const db = client.db("inventory_database")
  
  // 如果集合不存在则创建 items 集合
  const collections = await db.listCollections({ name: "items" }).toArray()
  
  if (collections.length === 0) {
    await db.createCollection("items")
    console.log("Created 'items' collection in 'inventory_database' database")
  } else {
    console.log("'items' collection already exists in 'inventory_database' database")
  }
}

// 创建向量搜索索引的函数
async function createVectorSearchIndex(): Promise<void> {
  try {
    const db = client.db("inventory_database")
    const collection = db.collection("items")
    // 删除集合上现有的所有索引
    await collection.dropIndexes()
    // 定义向量搜索索引配置
    const vectorSearchIdx = {
      name: "vector_index",                              // 索引名称
      type: "vectorSearch",                              // 索引类型：向量搜索
      definition: {                                      // 索引定义
        "fields": [
          {
            "type": "vector",                            // 字段类型：向量
            "path": "embedding",                         // 存储向量的字段路径
            "numDimensions": 768,                        // 向量维度（768 维）
            "similarity": "cosine"                       // 相似度算法：余弦相似度
          }
        ]
      }
    }
    console.log("Creating vector search index...")
    // 在集合上创建向量搜索索引
    await collection.createSearchIndex(vectorSearchIdx);

    console.log("Successfully created vector search index");
  } catch (e) {
    // 输出创建索引失败的错误信息
    console.error('Failed to create vector search index:', e);
  }
}

// 使用 AI 生成合成数据的函数
async function generateSyntheticData(): Promise<Item[]> {
  // 创建详细提示词，指示 AI 生成家具商店数据
  const prompt = `You are a helpful assistant that generates furniture store item data. Generate 10 furniture store items. Each record should include the following fields: item_id, item_name, item_description, brand, manufacturer_address, prices, categories, user_reviews, notes. Ensure variety in the data and realistic values.

  ${parser.getFormatInstructions()}`  // 附加解析器的格式要求说明

  // 在控制台输出进度日志
  console.log("Generating synthetic data...")

  // 将提示词发送给 AI 并获取响应
  const response = await llm.invoke(prompt)
  // 将 AI 响应解析为结构化的 Item 对象数组
  return parser.parse(response.content as string)
}

// 根据家具商品数据创建可搜索文本摘要的函数
async function createItemSummary(item: Item): Promise<string> {
  // 返回 Promise 以保持异步兼容性（尽管该函数本身是同步的）
  return new Promise((resolve) => {
    // 提取制造商国家信息
    const manufacturerDetails = `Made in ${item.manufacturer_address.country}`
    // 将所有分类用逗号拼接成字符串
    const categories = item.categories.join(", ")
    // 将用户评价数组转换为可读的文本格式
    const userReviews = item.user_reviews
      .map(
        (review) =>
          `Rated ${review.rating} on ${review.review_date}: ${review.comment}`
      )
      .join(" ")  // 用空格拼接多条评价
    // 创建基础商品信息字符串
    const basicInfo = `${item.item_name} ${item.item_description} from the brand ${item.brand}`
    // 格式化价格信息
    const price = `At full price it costs: ${item.prices.full_price} USD, On sale it costs: ${item.prices.sale_price} USD`
    // 获取附加说明
    const notes = item.notes

    // 将所有信息组合成用于向量搜索的完整摘要
    const summary = `${basicInfo}. Manufacturer: ${manufacturerDetails}. Categories: ${categories}. Reviews: ${userReviews}. Price: ${price}. Notes: ${notes}`

    // 用完整摘要完成 Promise
    resolve(summary)
  })
}

// 使用 AI 生成的家具数据填充数据库的主函数
async function seedDatabase(): Promise<void> {
  try {
    // 建立与 MongoDB Atlas 的连接
    await client.connect()
    // 通过 ping 命令验证数据库连接是否正常
    await client.db("admin").command({ ping: 1 })
    // 输出连接成功日志
    console.log("You successfully connected to MongoDB!")

    // 设置数据库和集合
    await setupDatabaseAndCollection()
    
    // 创建向量搜索索引
    await createVectorSearchIndex()

    // 获取指定数据库的引用
    const db = client.db("inventory_database")
    // 获取 items 集合的引用
    const collection = db.collection("items")

    // 清空集合中的现有数据（全新开始）
    await collection.deleteMany({})
    console.log("Cleared existing data from items collection")
    
    // 使用 AI 生成新的合成家具数据
    const syntheticData = await generateSyntheticData()

    // 处理每条数据：创建摘要并准备向量存储
    const recordsWithSummaries = await Promise.all(
      syntheticData.map(async (record) => ({
        pageContent: await createItemSummary(record),  // 创建可搜索的摘要
        metadata: {...record},                         // 保留原始商品数据
      }))
    )
    
    // 将每条记录连同向量嵌入存入 MongoDB
    for (const record of recordsWithSummaries) {
      // 使用 Gemini 创建向量嵌入并存入 MongoDB Atlas
      await MongoDBAtlasVectorSearch.fromDocuments(
        [record],                    // 包含单条记录的数组
        new GoogleGenerativeAIEmbeddings({            // Google 嵌入模型
          apiKey: process.env.GOOGLE_API_KEY,         // Google API 密钥
          modelName: "text-embedding-004",            // Google 标准嵌入模型（768 维）
        }),
        {
          collection,                // MongoDB 集合引用
          indexName: "vector_index", // 向量搜索索引名称
          textKey: "embedding_text", // 可搜索文本的字段名
          embeddingKey: "embedding", // 向量嵌入的字段名
        }
      )

      // 为每条成功处理的数据输出进度日志
      console.log("Successfully processed & saved record:", record.metadata.item_id)
    }

    // 输出整个数据填充过程完成的日志
    console.log("Database seeding completed")

  } catch (error) {
    // 记录数据填充过程中出现的任何错误
    console.error("Error seeding database:", error)
  } finally {
    // 结束时始终关闭数据库连接（清理资源）
    await client.close()
  }
}

// 执行数据填充函数并处理任何错误
seedDatabase().catch(console.error)
