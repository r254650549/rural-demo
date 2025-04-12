import localeMessageBox from '@/components/message-box/locale/en-US';
import localeLogin from '@/views/login/locale/en-US';
import localeWorkplace from '@/views/dashboard/workplace/locale/en-US';
import localeGroundImagery from '@/views/dashboard/ground-imagery/locale/en-US';
import localeSettings from './en-US/settings';

export default {
  'menu.dashboard': 'Dashboard',
  'menu.server.dashboard': 'Dashboard-Server',
  'menu.server.workplace': 'Workplace-Server',
  'menu.server.workplace.doran': 'Drone Image',
  'menu.server.workplace.onground': 'Ground Image',
  'menu.server.monitor': 'Monitor-Server',
  'menu.list': 'List',
  'menu.result': 'Result',
  'menu.exception': 'Exception',
  'menu.form': 'Form',
  'menu.profile': 'Profile',
  'menu.visualization': 'Data Visualization',
  'menu.user': 'User Center',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': 'FAQ',
  'navbar.docs': 'Docs',
  'navbar.action.locale': 'Switch to English',
  'workplace.imageUploader.title': 'Upload Images',
  'workplace.imageUploader.uploadText': 'Upload',
  'workplace.imageUploader.preview': 'Image Preview',
  'workplace.imageUploader.confirm': 'Confirm Upload',
  'workplace.imageUploader.clear': 'Clear All',
  'workplace.imageUploader.dropHere': 'Drop images here to upload',
  'workplace.imageStitcher.title': 'Image Stitching',
  'workplace.imageStitcher.noImagesAlert': 'Please upload images first',
  'workplace.imageStitcher.selectedImages': '{count} images selected',
  'workplace.imageStitcher.startStitching': 'Start Stitching',
  'workplace.imageStitcher.stitchedResult': 'Stitched Result',
  'workplace.imageStitcher.enlarge': 'Enlarge',
  'workplace.imageStitcher.crop': 'Crop Image',
  'workplace.imageStitcher.restore': 'Restore Original',
  'workplace.imageStitcher.enlargedView': 'Enlarged View',
  'workplace.imageStitcher.cropImage': 'Crop Image',
  'workplace.imageStitcher.cropInstructions':
    'Click and drag to select the area you want to crop',
  'workplace.imageStitcher.applyCrop': 'Apply Crop',
  'workplace.imageStitcher.cancelCrop': 'Cancel',
  'workplace.imageStitcher.resetSelection': 'Reset Selection',
  'workplace.imageStitcher.resetZoom': 'Reset Zoom',
  'workplace.imageStitcher.zoomIn': 'Zoom In',
  'workplace.imageStitcher.zoomOut': 'Zoom Out',
  'workplace.userGuide.title': 'User Guide',
  'workplace.userGuide.step1.title': '1. Upload Images',
  'workplace.userGuide.step1.description':
    'Upload multiple images that you want to stitch together',
  'workplace.userGuide.step2.title': '2. Stitch Images',
  'workplace.userGuide.step2.description':
    'Start the stitching process to combine all uploaded images',
  'workplace.userGuide.step3.title': '3. Extract Targets',
  'workplace.userGuide.step3.description':
    'Use AI to automatically identify and extract targets',
  'workplace.userGuide.tipsTitle': 'Tips',
  'workplace.userGuide.tip1':
    'For best results, use images taken from similar angles',
  'workplace.userGuide.tip2':
    'Target extraction works best on clearly visible objects',

  // Message notifications
  'message.imageStitcher.imageLoaded': 'Stitched image loaded successfully',
  'message.imageStitcher.smallSelection': 'Selected area is too small',

  // Common translations used across components
  'common.reset': 'Reset',
  'common.download': 'Download',

  ...localeSettings,
  ...localeMessageBox,
  ...localeLogin,
  ...localeWorkplace,
  ...localeGroundImagery,
};
