import localeMessageBox from '@/components/message-box/locale/zh-CN';
import localeLogin from '@/views/login/locale/zh-CN';
import localeWorkplace from '@/views/dashboard/workplace/locale/zh-CN';
import localeGroundImagery from '@/views/dashboard/ground-imagery/locale/zh-CN';
import localeSettings from './zh-CN/settings';

export default {
  'menu.dashboard': '仪表盘',
  'menu.server.dashboard': '仪表盘-服务端',
  'menu.server.workplace': '工作台-服务端',
  'menu.server.workplace.doran': '影像拼接处理',
  'menu.server.workplace.onground': '影像处理',
  'menu.server.monitor': '实时监控-服务端',
  'menu.list': '列表页',
  'menu.result': '结果页',
  'menu.exception': '异常页',
  'menu.form': '表单页',
  'menu.profile': '详情页',
  'menu.visualization': '数据可视化',
  'menu.user': '个人中心',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': '常见问题',
  'navbar.docs': '文档中心',
  'navbar.action.locale': '切换为中文',
  'workplace.imageUploader.title': '上传图片',
  'workplace.imageUploader.uploadText': '上传',
  'workplace.imageUploader.preview': '图片预览',
  'workplace.imageUploader.confirm': '确认上传',
  'workplace.imageUploader.clear': '清空',
  'workplace.imageUploader.dropHere': '放开以上传图片',
  'workplace.imageStitcher.title': '图像拼接',
  'workplace.imageStitcher.noImagesAlert': '请先上传图片',
  'workplace.imageStitcher.selectedImages': '已选择 {count} 张图片',
  'workplace.imageStitcher.startStitching': '开始拼接',
  'workplace.imageStitcher.stitchedResult': '拼接结果',
  'workplace.imageStitcher.enlarge': '放大',
  'workplace.imageStitcher.crop': '裁剪图片',
  'workplace.imageStitcher.restore': '还原原图',
  'workplace.imageStitcher.enlargedView': '放大视图',
  'workplace.imageStitcher.cropImage': '裁剪图片',
  'workplace.imageStitcher.cropInstructions': '点击并拖动以选择要裁剪的区域',
  'workplace.imageStitcher.applyCrop': '应用裁剪',
  'workplace.imageStitcher.cancelCrop': '取消',
  'workplace.imageStitcher.resetSelection': '重置选区',
  'workplace.imageStitcher.resetZoom': '重置缩放',
  'workplace.imageStitcher.zoomIn': '放大',
  'workplace.imageStitcher.zoomOut': '缩小',
  'workplace.userGuide.title': '用户指南',
  'workplace.userGuide.step1.title': '1. 上传图片',
  'workplace.userGuide.step1.description': '上传您想要拼接的多张图片',
  'workplace.userGuide.step2.title': '2. 图像拼接',
  'workplace.userGuide.step2.description':
    '启动拼接过程，将所有上传的图像组合在一起',
  'workplace.userGuide.step3.title': '3. 提取目标',
  'workplace.userGuide.step3.description': '使用AI自动识别并提取目标',
  'workplace.userGuide.tipsTitle': '提示',
  'workplace.userGuide.tip1': '为了获得最佳效果，请使用从相似角度拍摄的图像',
  'workplace.userGuide.tip2': '目标提取对于清晰可见的物体效果最佳',

  // Message notifications
  'message.imageStitcher.imageLoaded': '拼接图像加载成功',
  'message.imageStitcher.smallSelection': '选择的区域太小',

  // Common translations used across components
  'common.reset': '重置',
  'common.download': '下载',

  ...localeSettings,
  ...localeMessageBox,
  ...localeLogin,
  ...localeWorkplace,
  ...localeGroundImagery,
};
