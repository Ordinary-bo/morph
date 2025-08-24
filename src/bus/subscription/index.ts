import {eventBus} from 'tools-browser'

// 刷新订阅列表
const refreshSubscriptions = () => {
  eventBus.emit('refreshSubscriptions');
}
// 监听订阅列表刷新事件
