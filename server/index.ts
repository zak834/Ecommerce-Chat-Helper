// 从 .env 文件加载环境变量（必须是第一个导入）
import 'dotenv/config'
// 导入 Express 框架，用于创建 Web 服务器
import express, { Express, Request, Response } from "express"
// 导入 MongoDB 客户端，用于数据库连接
import { MongoClient } from "mongodb"
// 导入我们自定义的 AI 智能体函数
import { callAgent } from './agent'

// 创建 Express 应用实例
const app: Express = express()
// 导入 CORS 中间件，用于处理跨域请求
import cors from 'cors'
// 为所有路由启用 CORS（允许前端调用此 API）
app.use(cors())
// 启用 JSON 解析以处理传入的请求（req.body 将包含解析后的 JSON）
app.use(express.json())

// 使用环境变量中的连接字符串创建 MongoDB 客户端
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// 初始化并启动服务器的异步函数
async function startServer() {
  try {
    // 建立与 MongoDB Atlas 的连接
    await client.connect()
    // 通过 ping 命令验证 MongoDB 连接是否正常
    await client.db("admin").command({ ping: 1 })
    // 输出连接成功日志
    console.log("You successfully connected to MongoDB!")

    // 定义根端点（GET /）— 简单的健康检查
    app.get('/', (req: Request, res: Response) => {
      // 发送简单响应以确认服务器正在运行
      res.send('LangGraph Agent Server')
    })

    // 定义开启新对话的端点（POST /chat）
    app.post('/chat', async (req: Request, res: Response) => {
      // 从请求体中提取用户消息
      const initialMessage = req.body.message
      // 使用当前时间戳生成唯一的线程 ID
      const threadId = Date.now().toString()
      // 输出传入的消息以便调试
      console.log(initialMessage)
      try {
        // 使用消息和新建的线程 ID 调用 AI 智能体
        const response = await callAgent(client, initialMessage, threadId)
        // 发送包含线程 ID 和 AI 回复的成功响应
        res.json({ threadId, response })
      } catch (error) {
        // 记录智能体执行过程中出现的任何错误
        console.error('Error starting conversation:', error)
        // 发送带有 500 状态码的错误响应
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // 定义继续已有对话的端点（POST /chat/:threadId）
    app.post('/chat/:threadId', async (req: Request, res: Response) => {
      // 从 URL 参数中提取线程 ID
      const { threadId } = req.params
      // 从请求体中提取用户消息
      const { message } = req.body
      try {
        // 使用消息和已有的线程 ID 调用 AI 智能体（延续对话）
        const response = await callAgent(client, message, threadId)
        // 发送 AI 回复（对话延续时无需再次发送线程 ID）
        res.json({ response })
      } catch (error) {
        // 记录智能体执行过程中出现的任何错误
        console.error('Error in chat:', error)
        // 发送带有 500 状态码的错误响应
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // 从环境变量获取端口号，默认为 8000
    const PORT = process.env.PORT || 8000
    // 在指定端口上启动 Express 服务器
    app.listen(PORT, () => {
      // 输出服务器正在运行及其端口
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    // 处理服务器启动过程中的任何错误（尤其是 MongoDB 连接错误）
    console.error('Error connecting to MongoDB:', error)
    // 以错误码 1 退出进程（表示失败）
    process.exit(1)
  }
}

// 启动服务器（应用程序的入口点）
startServer()
