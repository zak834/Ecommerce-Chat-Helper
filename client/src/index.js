// 导入 React 核心库（JSX 语法依赖 React 在作用域内）
import React from 'react';
// 导入 React DOM 的客户端渲染入口（React 18+ 推荐使用 createRoot API）
import ReactDOM from 'react-dom/client';
// 导入全局基础样式（字体、外边距重置等）
import './index.css';
// 导入应用根组件 App（整个组件树的顶层）
import App from './App';

// 获取 public/index.html 中 id 为 "root" 的 DOM 节点，作为 React 应用的挂载点
const root = ReactDOM.createRoot(document.getElementById('root'));
// 将 <App /> 包裹在 StrictMode 中渲染到挂载点（StrictMode 用于开发环境检测潜在问题）
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
