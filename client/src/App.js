// 导入应用全局样式表
import './App.css';
// 导入电商商店页面组件（包含头部导航、Hero 横幅、页脚和聊天悬浮窗）
import ECommerceStore from './components/ECommerceStore.js';

// 应用根组件：目前只负责挂载 ECommerceStore 页面
function App() {
  return (
    // 最外层容器（注意：App.css 中定义的是 .App 大写类名，此处 .app 不会命中该样式）
    <div className="app">
      {/* 渲染电商商店主组件 */}
      <ECommerceStore/>
    </div>
  )
}

// 默认导出 App 组件，供 index.js 引用
export default App;
