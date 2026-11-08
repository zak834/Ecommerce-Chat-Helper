// 从 react 导入钩子：useState（状态管理）、useEffect（副作用）、useRef（引用 DOM 元素）
// 注意：`use` 是 React 实验性 API，本文件并未实际使用，属于多余导入
import React, { useState, useEffect, useRef, use } from 'react'
// 导入 react-icons 提供的 Font Awesome 图标组件：机器人、发送（纸飞机）、关闭（叉号）、聊天气泡
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots } from 'react-icons/fa'


// 聊天悬浮窗组件：电商网站右下角的 AI 客服入口（收起时是圆形按钮，展开后是聊天窗口）
const ChatWidget = () => {
    // 聊天窗口是否展开（false 时只显示右下角圆形气泡按钮）
    const [isOpen, setIsOpen] = useState(false)
    // 消息列表，每条消息形如 { text: string, isAgent: boolean, threadId?: string }
    const [messages, setMessages] = useState([])
    // 输入框当前内容（受控组件：值由 React 状态驱动）
    const [inputValue, setInputValue] = useState('')
    // 会话线程 ID：首次对话由后端生成并随响应返回，之后用于继续同一会话（服务端凭它恢复上下文）
    const [threadId, setThreadId] = useState(null)
    // 指向消息列表底部空元素的引用，配合 useEffect 实现“自动滚动到最新消息”
    const messageEndRef = useRef(null)

    // 副作用一：当聊天窗口首次打开且还没有任何消息时，插入一条机器人欢迎语
    useEffect(() => {
        // 仅在“窗口已打开”且“消息列表为空”时执行
        if (isOpen && messages.length === 0) {
            // 构造初始欢迎消息（isAgent: true 表示该消息来自机器人，渲染在左侧）
            const initialMessages = [
                {
                    text: "Hello! I'm your shop assistant. How can I help you today?",
                    isAgent: true
                }
            ]
            // 把欢迎语写入消息列表
            setMessages(initialMessages)
        }
    }, [isOpen, messages.length]) // 依赖数组：开关状态或消息数量变化时重新检查

    // 副作用二：消息列表变化时，平滑滚动到底部，保证最新消息始终可见
    useEffect(() => {
        // 可选链：若 ref 尚未挂载则不执行；behavior: 'smooth' 表示平滑滚动动画
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    },[messages]) // 依赖数组：messages 变化时触发滚动

    // 切换聊天窗口的打开/收起状态（由头部关闭按钮和右下角圆形按钮共用）
    const toggleChat = () => {
        // 对当前状态取反
        setIsOpen(!isOpen)
    }

    // 输入框 onChange 处理函数：把用户键入的内容同步到状态
    const handleInputChange = (e) => {
        // e.target 是触发事件的 <input> 元素，value 为当前输入值
        setInputValue(e.target.value)
    }

    // 调试日志：打印当前消息列表（开发调试用，生产环境建议移除）
    console.log("Messages: ", messages)

    // 表单提交处理函数：发送用户消息到后端，并接收 AI 的回复
    const handleMessage = async(e) => {
        // 阻止表单默认提交行为（避免浏览器刷新页面）
        e.preventDefault()
        // 调试日志：打印即将发送的输入内容
        console.log(inputValue)

        // 构造用户消息对象（isAgent: false 表示来自用户，渲染在右侧）
        const message = {
            text: inputValue,
            isAgent: false
        }
        // 用函数式更新把新消息追加到列表末尾（避免读到闭包中的旧状态）
        setMessages((prevMessages) => [...prevMessages, message])
        // 清空输入框
        setInputValue("")

        // 根据是否已有 threadId 选择接口：
        // - 无 threadId：POST /chat          → 开始全新会话（后端生成新 threadId）
        // - 有 threadId：POST /chat/:threadId → 继续既有会话（服务端恢复历史上下文）
        const endpoint = threadId ? `http://localhost:8000/chat/${threadId}` : 'http://localhost:8000/chat'

        try {
            // 向后端发起 POST 请求，请求体为 JSON 格式的用户消息
            const response = await fetch(endpoint, {
                method: 'POST',                               // HTTP 方法：POST
                headers: {                                    // 请求头
                    'Content-Type': 'application/json',       // 告知后端请求体是 JSON
                },
                body: JSON.stringify({ message: inputValue }) // 请求体：{ "message": "..." }
            })

            // 若 HTTP 状态码不在 200~299 区间，抛出错误并进入下方 catch
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            // 把响应体解析为 JavaScript 对象
            const data = await response.json()

            // 调试日志：打印成功响应（含 response 与 threadId）
            console.log('Success:', data)

            // 构造 AI 回复消息对象（带上后端返回的 threadId，便于调试追踪）
            const agentResponse = {
                text: data.response,
                isAgent: true,
                threadId: data.threadId
            }

            // 把 AI 回复追加到消息列表
            setMessages(prevMessages => [...prevMessages, agentResponse])
            // 记录 threadId，之后的提问将带上它以延续同一会话
            // 注意：继续会话接口（/chat/:threadId）只返回 { response }，
            // 此时 data.threadId 为 undefined，会把已有的 threadId 覆盖清空，
            // 导致下一轮提问误走 /chat 新建会话、丢失上下文（详见架构文档“已知问题”）
            setThreadId(data.threadId)

            // 调试日志（注意：打印的是本次闭包捕获的旧 messages，不含最新回复）
            console.log(messages)

        } catch (error) {
            // 请求失败（网络错误、后端 500 等）：仅打印错误，未向用户展示提示
            console.log("Error:",error)

        }
    }



    // 组件渲染：根据 isOpen 切换“完整聊天窗口”或“圆形气泡按钮”
    return (
        // 外层容器：isOpen 时附加 open 类，CSS 据此从圆形按钮形态过渡到窗口形态
        <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
            {isOpen ? (
                // —— 展开状态：完整聊天窗口 ——
                <>
                {/* 顶部标题栏：机器人图标 + 标题 + 关闭按钮 */}
                <div className="chat-header">
                    {/* 标题区域：图标与文字水平排列 */}
                    <div className="chat-title">
                        {/* 机器人图标 */}
                        <FaRobot/>
                        {/* 窗口标题文字 */}
                        <h3>Shop Assistant</h3>
                    </div>
                    {/* 关闭按钮：点击收起聊天窗口 */}
                    <button className="close-button" onClick={toggleChat}>
                        {/* 关闭（叉号）图标 */}
                        <FaTimes/>
                    </button>
                </div>

                {/* 消息展示区域：垂直滚动，flex 纵向排列所有气泡 */}
                <div className="chat-messages">
                    {/* 遍历消息列表，逐条渲染（使用数组索引作为 key） */}
                    {messages.map((message, index) => (
                        <div key={index}>
                            {/* 按消息来源套用不同样式：message-bot（左侧灰） / message-user（右侧紫） */}
                            <div className={`message ${message.isAgent ? 'message-bot' : 'message-user'}`}>
                                {/* 消息文本内容 */}
                                {message.text}
                            </div>
                        </div>
                    ))}

                   {/* 空元素锚点：ref 指向列表最底部，配合 useEffect 实现自动滚动 */}
                   <div ref={messageEndRef}/>

                </div>

                {/* 底部输入区：form 提交事件绑定 handleMessage */}
                <form className="chat-input-container" onSubmit={handleMessage}>
                    {/* 文本输入框：受控组件 */}
                    <input
                        type="text"                          /* 输入类型：单行文本 */
                        class ="message-input"               /* 注意：应为 className（React 规范），class 写法不符合 JSX */
                        placeholder="Type your message..."  /* 占位提示文字 */
                        value={inputValue}                   /* 受控值：绑定 inputValue 状态 */
                        onChange={handleInputChange}         /* 输入变化时同步到状态 */
                    />
                    {/* 发送按钮：输入为空（去除首尾空格后）时禁用 */}
                    <button
                        type="submit"                        /* 点击触发表单 onSubmit */
                        className="send-button"              /* 按钮样式类 */
                        disabled={inputValue.trim() === ''}> /* 空输入时禁用发送 */
                        {/* 发送（纸飞机）图标，尺寸 16px */}
                        <FaPaperPlane size={16}/>
                    </button>
                </form>
                </>
            ):(
                    // —— 收起状态：仅显示右下角圆形聊天气泡按钮，点击展开窗口 ——
                    <button className="chat-button" onClick={toggleChat}>
                    {/* 聊天气泡图标 */}
                    <FaCommentDots/>
                    </button>
            )}
        </div>
    )
}

// 默认导出组件，供 ECommerceStore 引用
export default ChatWidget
