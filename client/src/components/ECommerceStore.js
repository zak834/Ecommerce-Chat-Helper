// 从 react-icons 引入 Font Awesome 图标：搜索（放大镜）、购物车、用户、收藏（心形）
import { FaSearch, FaShoppingCart, FaUser, FaHeart } from 'react-icons/fa'
// 引入聊天悬浮窗组件（AI 客服入口），会在页面底部挂载
import ChatWidget from './ChatWidget'

// 电商商店页面组件：静态演示页，由头部导航、Hero 促销横幅、页脚和聊天悬浮窗组成
const EcommerceStore = () => {

    return (
        // Fragment 空标签：包裹多个顶层元素而不产生额外 DOM 节点
        <>
        {/* 页面头部：吸顶导航区域 */}
        <header className="header">
            {/* 内容容器：限制最大宽度并水平居中 */}
            <div className="container">
                {/* 顶栏：logo + 搜索框 + 功能图标，三段式布局 */}
                <div className="top-bar">
                    {/* 网站名称（文字 logo） */}
                    <div className="logo">ShopSmart</div>
                    {/* 搜索栏：输入框 + 搜索按钮（纯静态，无搜索逻辑） */}
                    <div className="search-bar">
                        {/* 搜索关键字输入框 */}
                        <input type="text" placeholder="Search for products..." />
                        {/* 搜索按钮 */}
                        <button>
                            {/* 放大镜图标 */}
                            <FaSearch/>
                        </button>
                    </div>
                    {/* 右侧功能图标区：账户 / 收藏 / 购物车 */}
                    <div className="nav-icons">
                        {/* 账户入口链接 */}
                        <a href="#account">
                            {/* 用户图标，size 单位为像素 */}
                            <FaUser size={20} />
                        </a>
                        {/* 收藏夹入口链接 */}
                        <a href="#wishlist">
                            {/* 心形图标 */}
                            <FaHeart size={20} />
                            {/* 收藏数量角标：硬编码演示数据 3 */}
                            <span className="badge">{3}</span>
                        </a>
                        {/* 购物车入口链接 */}
                        <a href="#cart">
                            {/* 购物车图标 */}
                            <FaShoppingCart size={20} />
                            {/* 购物车数量角标：硬编码演示数据 2 */}
                            <span className="badge">{2}</span>
                        </a>
                    </div>
                </div>
                {/* 商品分类导航条 */}
                <nav className="nav-bar">
                    {/* 导航链接列表（均为占位链接，无跳转逻辑） */}
                    <ul>
                        {/* 首页（当前激活项，带高亮样式） */}
                        <li><a href="#" className="active">Home</a></li>
                        {/* 电子产品分类 */}
                        <li><a href="#">Electronics</a></li>
                        {/* 服装分类 */}
                        <li><a href="#">Clothing</a></li>
                        {/* 家居厨房分类 */}
                        <li><a href="#">Home & Kitchen</a></li>
                        {/* 美妆分类 */}
                        <li><a href="#">Beauty</a></li>
                        {/* 运动分类 */}
                        <li><a href="#">Sports</a></li>
                        {/* 优惠专区 */}
                        <li><a href="#">Deals</a></li>
                    </ul>
                </nav>
            </div>
        </header>

        {/* 页面主体内容 */}
        <main>
            {/* Hero 促销横幅：紫色渐变背景 */}
            <div className="hero">
                <div className="container">
                    {/* 促销标题 */}
                    <h1>Summer Sale is Live!</h1>
                    {/* 促销说明文案 */}
                    <p>Get up to 50% off on selected items. Limited time offer.</p>
                     {/* 立即购买按钮（无点击逻辑，纯展示） */}
                     <button>Shop Now</button>
                </div>
            </div>
        </main>

        {/* 页脚：多栏链接 + 版权信息 */}
        <footer className="footer">
            <div className="container">
                {/* 页脚栏目内容（CSS Grid 自适应多列布局） */}
                <div className="footer-content">
                    {/* 第一栏：商店分类链接 */}
                    <div className="footer-column">
                        {/* 栏目标题 */}
                        <h3>Shop</h3>
                        {/* 分类链接列表（占位） */}
                        <ul>
                            <li><a href="#">Electronics</a></li>
                            <li><a href="#">Clothing</a></li>
                            <li><a href="#">Home & Kitchen</a></li>
                            <li><a href="#">Beauty</a></li>
                            <li><a href="#">Sports</a></li>
                        </ul>
                    </div>
                {/* 第二栏：客户服务链接 */}
                <div className="footer-column">
                        {/* 栏目标题 */}
                        <h3>Customer Service</h3>
                        <ul>
                            {/* 联系我们 */}
                            <li><a href="#">Contact Us</a></li>
                            {/* 常见问题 */}
                            <li><a href="#">FAQs</a></li>
                            {/* 配送政策（原文 shipping 首字母未大写） */}
                            <li><a href="#">shipping Policy</a></li>
                            {/* 退换货政策 */}
                            <li><a href="#">Returns & Exchanges</a></li>
                            {/* 订单追踪 */}
                            <li><a href="#">Order Tracking</a></li>
                        </ul>
                    </div>
                {/* 第三栏：关于我们 */}
                <div className="footer-column">
                        {/* 栏目标题 */}
                        <h3>About Us</h3>
                        <ul>
                            {/* 品牌故事 */}
                            <li><a href="#">Our Story</a></li>
                            {/* 博客 */}
                            <li><a href="#">Blog</a></li>
                            {/* 招聘信息 */}
                            <li><a href="#">Careers</a></li>
                            {/* 媒体报道 */}
                            <li><a href="#">Press</a></li>
                            {/* 可持续发展 */}
                            <li><a href="#">Sustainability</a></li>
                        </ul>
                    </div>
                {/* 第四栏：社交媒体入口 */}
                <div className="footer-column">
                        {/* 栏目标题 */}
                        <h3>Connect With Us</h3>
                        <ul>
                            {/* Facebook */}
                            <li><a href="#">Facebook</a></li>
                            {/* Instagram */}
                            <li><a href="#">Instagram</a></li>
                            {/* Twitter */}
                            <li><a href="#">Twitter</a></li>
                            {/* Pinterest */}
                            <li><a href="#">Pinterest</a></li>
                            {/* YouTube */}
                            <li><a href="#">YouTube</a></li>
                        </ul>
                    </div>
                </div>

                {/* 版权信息：注意 getFullYear 缺少调用括号 ()，会把函数源码渲染成文本 */}
                <div className="copyright">
                    &copy; {new Date().getFullYear} ShopSmart. All rights reserved.
                </div>
            </div>
        </footer>

        {/* 挂载 AI 客服聊天悬浮窗（右下角按钮 + 弹出聊天窗口） */}
        <ChatWidget/>
        </>
    )
}

// 默认导出组件，供 App.js 引用
export default EcommerceStore
