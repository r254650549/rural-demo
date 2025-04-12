<template>
  <div class="container">
    <div class="main-content">
      <div class="panel image-processing-panel">
        <!-- Add Clear All button at the top -->
        <div class="control-bar">
          <a-button 
            type="outline" 
            status="danger" 
            @click="handleClearAll"
          >
            <template #icon><icon-delete /></template>
            {{ $t('workplace.clearAll') || 'Clear All' }}
          </a-button>
        </div>
        
        <ImageUploader @images-uploaded="handleImagesUploaded" ref="imageUploaderRef" />
        <ImageStitcher 
          :images="uploadedImages" 
          :uploadResults="uploadResults"
          @stitch-completed="handleStitchCompleted" 
          @original-images-loaded="handleOriginalImagesLoaded"
          ref="imageStitcherRef"
        />
        <TargetExtractor 
          :stitchedImage="stitchedImage" 
          :resultPath="stitchedImagePath"
          :stitcherTaskName="stitcherTaskName"
          :uploadTaskName="uploadTaskName"
          :isCropped="isImageCropped"
          @extraction-completed="handleExtractionCompleted" 
          ref="targetExtractorRef"
        />
      </div>
    </div>
    
    <div class="right-sidebar">
      <UserGuide />
      <ProcessHistory 
        ref="processHistoryRef"
        @view-result="handleViewResult"
        @continue-workflow="handleContinueWorkflow"
      />
    </div>

    <!-- Loading overlay for async operations -->
    <div class="loading-overlay" v-if="isLoadingHistoryItem">
      <a-spin :size="36">
        <template #icon><icon-loading /></template>
        <template #tip>{{ loadingMessage }}</template>
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import axios from 'axios';
  import { useI18n } from 'vue-i18n'; // Import the useI18n composable
  import { getBaseURL } from '@/utils/env'; // Import the getBaseURL function
  import ImageUploader from './components/image-uploader.vue';
  import ImageStitcher from './components/image-stitcher.vue';
  import TargetExtractor from './components/target-extractor.vue';
  import UserGuide from './components/user-guide.vue';
  import ProcessHistory, { HistoryItem } from './components/process-history.vue';

  // Initialize i18n
  const { t: $t } = useI18n();

  // Get the base API URL from environment configuration
  const baseURL = getBaseURL();

  // Define state variables
  const uploadedImages = ref<File[]>([]);
  const uploadResults = ref<any[]>([]);
  const stitchedImage = ref<string>('');
  const stitchedImagePath = ref<string>('');
  const stitcherTaskName = ref<string>('');
  const uploadTaskName = ref<string>('');
  const isImageCropped = ref<boolean>(false);
  const extractedTargets = ref<string[]>([]);
  
  // Loading state for history item actions
  const isLoadingHistoryItem = ref(false);
  const loadingMessage = ref($t('workplace.loading') || 'Loading...');
  
  // References to child components
  const imageUploaderRef = ref<InstanceType<typeof ImageUploader> | null>(null);
  const imageStitcherRef = ref<InstanceType<typeof ImageStitcher> | null>(null);
  const targetExtractorRef = ref<InstanceType<typeof TargetExtractor> | null>(null);
  const processHistoryRef = ref<InstanceType<typeof ProcessHistory> | null>(null);

  // 添加一个标志变量，用于标记是否为继续处理操作，避免重复添加历史记录
  const isContinuingWorkflow = ref(false);

  // Function to get task details by ID
  const getTaskById = async (taskId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${baseURL}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching task details:', error);
      throw error;
    }
  };

  // Helper function to refresh history from backend
  const refreshHistory = () => {
    if (processHistoryRef.value) {
      processHistoryRef.value.fetchTaskHistory();
    }
  };

  // New function to clear all components
  const handleClearAll = () => {
    // Clear uploader component
    if (imageUploaderRef.value) {
      if (typeof imageUploaderRef.value.clearAll === 'function') {
        imageUploaderRef.value.clearAll();
      }
    }
    
    // Clear local state
    uploadedImages.value = [];
    uploadResults.value = [];
    
    // Clear stitcher component
    stitchedImage.value = '';
    stitchedImagePath.value = '';
    stitcherTaskName.value = '';
    uploadTaskName.value = '';
    isImageCropped.value = false;
    
    // Clear extractor component
    extractedTargets.value = [];
    
    // Show success message
    Message.success($t('workplace.clearAllSuccess') || 'All content has been cleared');
  };

  // Event handlers
  const handleImagesUploaded = (images: File[], results?: any[]) => {
    uploadedImages.value = images;
    if (results && results.length > 0) {
      uploadResults.value = results;
      
      // Extract upload task name if available
      const result = results[0];
      if (result && result.task_name) {
        uploadTaskName.value = result.task_name;
      }
      
      // Instead of manually adding to history, refresh from backend
      refreshHistory();
    }
  };

  // Handle original images loaded event from ImageStitcher
  const handleOriginalImagesLoaded = (originalImages: any[]) => {
    console.log('Original images received:', originalImages);
    
    // 设置标志位，防止添加到历史记录
    isContinuingWorkflow.value = true;
    
    // Only process if we have actual images
    if (originalImages && originalImages.length > 0) {
      // Update uploadResults with the correct format for both components
      uploadResults.value = [{
        task_name: uploadTaskName.value || 'Restored upload',
        data: originalImages
      }];
      
      // Create File objects for the uploadedImages array that the ImageStitcher component uses
      // This is needed because the v-if="images.length" in ImageStitcher checks uploadedImages.length
      // Create a dummy File object for each image
      uploadedImages.value = originalImages.map((img) => {
        const fileName = img.filename || 'image.jpg';
        const fileType = img.filename?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // Create File-like object
        return new File([''], fileName, { type: fileType });
      });
      
      console.log(`Created ${uploadedImages.value.length} placeholder file objects for the UI`);
      
      // If we have the image uploader component available, directly set the uploaded files
      if (imageUploaderRef.value) {
        // Call the method to set uploaded files, providing just the image data array
        imageUploaderRef.value.setUploadedFiles(originalImages, uploadTaskName.value);
        console.log(`Set ${originalImages.length} images in the uploader component`);
        
        // Force a refresh if needed (Vue sometimes needs this for reactivity issues)
        setTimeout(() => {
          // If the fileList in the child component is still empty, try again with a force flag
          if (uploadedImages.value.length > 0) {
            console.log('Ensuring images are visible in the UI');
          }
          
          // 操作完成后恢复标志位
          isContinuingWorkflow.value = false;
        }, 300);
      } else {
        // 如果没有找到组件，也要恢复标志位
        isContinuingWorkflow.value = false;
      }
    } else {
      console.warn('No original images provided to load');
      // 无论如何都要恢复标志位
      isContinuingWorkflow.value = false;
    }
  };

  const handleStitchCompleted = (resultImageUrl: string, metadata?: any) => {
    stitchedImage.value = resultImageUrl;
    
    // Store additional metadata if available
    if (metadata) {
      stitchedImagePath.value = metadata.resultPath || '';
      stitcherTaskName.value = metadata.stitcherTaskName || '';
      isImageCropped.value = !!metadata.isCropped;
    }
    
    // Instead of manually adding to history, refresh from backend
    if (!isContinuingWorkflow.value) {
      refreshHistory();
    }
  };

  const handleExtractionCompleted = (targets: string[]) => {
    extractedTargets.value = targets;
    
    // Instead of manually adding to history, refresh from backend
    refreshHistory();
  };
  
  const handleViewResult = async (item: HistoryItem) => {
    try {
      isLoadingHistoryItem.value = true;
      loadingMessage.value = $t('workplace.loadingDetails', { type: item.type }) || `Loading ${item.type} details...`;
      
      if (item.type === 'upload') {
        // For upload items, if we have API data, load the upload images
        if (item.rawData) {
          await loadUploadImages(item);
        } else {
          // For local history items, we don't need to do anything special
          Message.info($t('workplace.uploadDetailsDisplayed') || 'Upload details displayed');
        }
      } 
      else if (item.type === 'stitch') {
        // Load the stitched image
        stitchedImage.value = item.imageUrl || '';
        
        // Get metadata for this stitched result
        if (item.rawData) {
          await loadStitchDetails(item);
        }
        
        Message.success($t('workplace.stitchedImageLoaded') || 'Stitched image loaded');
      } 
      else if (item.type === 'extract') {
        // For extract items, display the extracted targets
        if (item.imageUrl) {
          extractedTargets.value = [item.imageUrl];
        }
        
        Message.success($t('workplace.extractedTargetsLoaded') || 'Extracted targets loaded');
      }
    } catch (error) {
      console.error('Error handling view result:', error);
      Message.error($t('workplace.failedToLoadResult') || 'Failed to load result');
    } finally {
      isLoadingHistoryItem.value = false;
    }
  };
  
  // Function to load upload images from a history item
  const loadUploadImages = async (item: HistoryItem) => {
    try {
      // Parse task_data_result to get uploaded image data
      const { rawData } = item;
      const resultData = JSON.parse(rawData?.task_data_result || '[]');
      
      if (resultData && resultData.length > 0) {
        // Clear existing images
        uploadedImages.value = [];
        uploadResults.value = [{
          task_name: rawData?.task_name,
          data: resultData
        }];
        
        // Set the upload task name
        uploadTaskName.value = rawData?.task_name || '';
        
        // Clear the later stages
        stitchedImage.value = '';
        stitchedImagePath.value = '';
        extractedTargets.value = [];
        
        Message.success($t('workplace.uploadedImagesLoaded') || 'Uploaded images loaded');
      } else {
        Message.warning($t('workplace.noImageDataFound') || 'No image data found for this upload');
      }
    } catch (error) {
      console.error('Error loading upload images:', error);
      throw error;
    }
  };
  
  // Function to load stitch details and related upload data
  const loadStitchDetails = async (item: HistoryItem) => {
    try {
      // Set the stitched image
      const { imageUrl, rawData, relativeUploadTask } = item;
      stitchedImage.value = imageUrl || '';
      
      // Extract metadata from the task
      if (rawData) {
        console.log('Raw stitch data:', rawData);
        
        // Parse the result data to get any path information
        const resultData = JSON.parse(rawData.task_data_result || '[]');
        if (resultData && resultData.length > 0) {
          const { path } = resultData[0];
          stitchedImagePath.value = path || '';
        }
        
        stitcherTaskName.value = rawData.task_name;
        
        // 原始图片加载策略 - 首先尝试获取原始输入数据
        let originalImages: any[] = [];
        
        // 1. 尝试从 task_data_input 直接获取输入图片信息
        const { task_data_input, upload_task } = rawData;
        if (task_data_input) {
          try {
            const inputData = JSON.parse(task_data_input);
            if (Array.isArray(inputData) && inputData.length > 0) {
              originalImages = inputData;
              console.log('Found original images from task_data_input:', originalImages.length);
            }
          } catch (e) {
            console.error('Error parsing task_data_input:', e);
          }
        }
        
        // 2. 如果没有从输入数据找到图片，尝试从关联的上传任务获取
        if (originalImages.length === 0 && upload_task) {
          const uploadTask = upload_task;
          
          if (typeof uploadTask === 'object') {
            const { task_name, task_data_result, task_data_input: uploadTaskInput } = uploadTask;
            uploadTaskName.value = task_name || '';
            
            // 从上传任务结果中提取图片数据
            try {
              const uploadResultData = JSON.parse(task_data_result || '[]');
              
              if (uploadResultData && uploadResultData.length > 0) {
                originalImages = uploadResultData;
                console.log('Found original images from upload_task result:', originalImages.length);
              } else if (uploadTaskInput) {
                // 如果结果为空，尝试从输入数据中提取
                try {
                  const uploadInputData = JSON.parse(uploadTaskInput);
                  if (Array.isArray(uploadInputData) && uploadInputData.length > 0) {
                    originalImages = uploadInputData;
                    console.log('Found original images from upload_task input:', originalImages.length);
                  }
                } catch (e) {
                  console.error('Error parsing upload_task input:', e);
                }
              }
            } catch (e) {
              console.error('Error parsing upload_task result:', e);
            }
          } else if (typeof uploadTask === 'string' && relativeUploadTask) {
            // 处理 relativeUploadTask 字段
            uploadTaskName.value = relativeUploadTask;
            console.log('Using relativeUploadTask name:', uploadTaskName.value);
          }
        }
        
        // 3. 如果找到原始图片，设置到组件中
        if (originalImages && originalImages.length > 0) {
          console.log('Setting up original images:', originalImages.length);
          
          // 设置上传结果数据结构
          uploadResults.value = [{
            task_name: uploadTaskName.value || stitcherTaskName.value,
            data: originalImages
          }];
          
          // 创建 File 对象，用于在 ImageStitcher 中显示
          uploadedImages.value = originalImages.map((img: any) => {
            const { filename = 'image.jpg' } = img || {};
            const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            return new File([''], filename, { type: fileType });
          });
          
          // 如果 ImageUploader 组件存在，设置上传文件
          if (imageUploaderRef.value) {
            imageUploaderRef.value.setUploadedFiles(originalImages, uploadTaskName.value);
            console.log('Set original images in uploader component');
          }
        } else {
          console.warn('No original images found in task data');
        }
      }
    } catch (error) {
      console.error('Error loading stitch details:', error);
      throw error;
    }
  };
  
  // Handler for continuing a workflow from history
  const handleContinueWorkflow = async (item: HistoryItem) => {
    try {
      isLoadingHistoryItem.value = true;
      loadingMessage.value = $t('workplace.preparingWorkflow') || 'Preparing to continue workflow...';
      
      // 设置标志，表明正在执行继续处理操作
      isContinuingWorkflow.value = true;
      
      const { type, rawData } = item;
      
      if (type === 'stitch') {
        // 保存当前的拼接图像，防止在加载过程中丢失
        const currentStitchedImage = item.imageUrl || '';
        
        // First, view the result to load the image and metadata
        await handleViewResult(item);
        
        // 拼接图像已经设置好了，现在确保原始图片也正确加载
        // 确保拼接图像不会丢失
        if (stitchedImage.value !== currentStitchedImage && currentStitchedImage) {
          stitchedImage.value = currentStitchedImage;
        }
        
        if (stitchedImage.value) {
          // 直接从 rawData.task_data_input 获取原始图片数据，它一定有数据
          let originalImages: any[] = [];
          
          if (rawData && rawData.task_data_input) {
            try {
              const inputData = JSON.parse(rawData.task_data_input || '[]');
              if (Array.isArray(inputData) && inputData.length > 0) {
                originalImages = inputData;
                console.log('Found original images from task_data_input:', originalImages.length);
              }
            } catch (e) {
              console.error('Error parsing task_data_input:', e);
            }
          }
          
          // 确保 originalImages 是数组
          if (!Array.isArray(originalImages)) {
            console.warn('originalImages is not an array, converting to array');
            originalImages = originalImages ? [originalImages] : [];
          }
          
          // 如果没有原始图片数据，创建占位图片
          if (originalImages.length === 0) {
            console.warn('No original images found, creating placeholder data');
            originalImages = [
              {
                filename: 'placeholder.jpg',
                path: '',
                url: stitchedImage.value // 使用拼接后的图片URL作为占位符
              }
            ];
          }
          
          // 确保 uploadResults 有正确的数据
          uploadResults.value = [{
            task_name: uploadTaskName.value || 'Restored upload',
            data: originalImages
          }];
          
          // 创建 File 对象用于 ImageStitcher 组件
          uploadedImages.value = originalImages.map((img: any) => {
            const { filename = 'image.jpg' } = img || {};
            const fileName = filename;
            const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            return new File([''], fileName, { type: fileType });
          });
          
          console.log('Created file objects for UI:', uploadedImages.value.length);
          
          // 设置 ImageUploader 组件
          if (imageUploaderRef.value) {
            imageUploaderRef.value.setUploadedFiles(originalImages, uploadTaskName.value);
            console.log('Set images in uploader component:', originalImages.length, 'with task name:', uploadTaskName.value);
          }
          
          // 设置组件并更新 UI - 确保所有组件操作完成后再恢复标志位
          await new Promise(resolve => {
            setTimeout(() => {
              // 再次确保 ImageUploader 有数据
              if (imageUploaderRef.value) {
                imageUploaderRef.value.setUploadedFiles(originalImages, uploadTaskName.value);
              }
              
              // 设置 ImageStitcher 组件 - 注意：这里可能导致图片消失
              if (imageStitcherRef.value) {
                console.log('Setting stitched image with original images:', originalImages.length);
                // 使用 skipEmit 参数避免触发事件引起的重复处理
                imageStitcherRef.value.loadStitchedImage(
                  stitchedImage.value,
                  {
                    stitcherTaskName: stitcherTaskName.value,
                    uploadTaskName: uploadTaskName.value,
                    resultPath: stitchedImagePath.value,
                    originalImages,
                    skipEmit: true // 添加参数，告知组件不需要触发事件
                  }
                );
              }
              
              // 设置 TargetExtractor 组件 - 确保 isContinuingWorkflow 标志仍然为 true
              if (targetExtractorRef.value) {
                // 使用组件提供的方法，而不是直接设置属性
                targetExtractorRef.value.loadStitchedImage(stitchedImage.value, stitchedImagePath.value);
              }
              
              // 滚动到拼接图像组件
              const imageStitcherElement = document.querySelector('.image-stitcher');
              if (imageStitcherElement) {
                imageStitcherElement.scrollIntoView({ behavior: 'smooth' });
              }
              
              resolve(true);
            }, 200);
          });
          
          Message.success($t('workplace.stitchedImageLoadedProceed') || 'Stitched image loaded, you can edit it or proceed to target extraction');
        } else {
          Message.error($t('workplace.failedToLoadStitchedImage') || 'Failed to load stitched image');
        }
      } 
      else if (type === 'upload') {
        // First, view the result to load the uploaded images
        await handleViewResult(item);
        
        // Make sure the uploaded images are properly set to the image uploader component
        if (uploadResults.value.length > 0 && uploadResults.value[0]?.data) {
          // 确保 data 是数组类型
          let originalImages: any[] = [];
          const { data } = uploadResults.value[0];
          
          if (Array.isArray(data)) {
            originalImages = data;
            console.log('Using original images from uploadResults:', originalImages.length);
          } else {
            console.warn('uploadResults data is not an array:', data);
            originalImages = data ? [data] : [];
          }
          
          // Check if we have the image uploader component available
          if (imageUploaderRef.value) {
            // 调用方法设置上传文件，并传递任务名称
            imageUploaderRef.value.setUploadedFiles(originalImages, uploadTaskName.value);
            console.log('Uploaded files set in uploader for', originalImages.length, 'images with task name:', uploadTaskName.value);
            
            // Set dummy File objects for the ImageStitcher component
            uploadedImages.value = originalImages.map((img: any) => {
              const { filename = 'image.jpg' } = img || {};
              const fileName = filename;
              const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              return new File([''], fileName, { type: fileType });
            });
          }
          
          // Wait for Vue to update the components before scrolling
          await new Promise(resolve => {
            setTimeout(() => {
              // Scroll to the image stitcher component for the next step
              const imageStitcherElement = document.querySelector('.image-stitcher');
              if (imageStitcherElement) {
                imageStitcherElement.scrollIntoView({ behavior: 'smooth' });
              }
              resolve(true);
            }, 200);
          });
          
          Message.success($t('workplace.uploadedImagesLoadedReady') || 'Uploaded images loaded, ready to continue with stitching');
        } else {
          Message.error($t('workplace.failedToLoadUploadedImages') || 'Failed to load uploaded images');
        }
      }
    } catch (error) {
      console.error('Error continuing workflow:', error);
      Message.error($t('workplace.failedToContinueWorkflow') || 'Failed to continue workflow');
    } finally {
      // 最后才重置标志，确保所有异步操作完成后再重置
      isLoadingHistoryItem.value = false;
      isContinuingWorkflow.value = false;
    }
  };
</script>

<script lang="ts">
  export default {
    name: 'Dashboard', // If you want the include property of keep-alive to take effect, you must name the component
  };
</script>

<style lang="less" scoped>
  .container {
    background-color: var(--color-fill-2);
    padding: 16px 20px;
    min-height: 100%;
    display: flex;
    gap: 20px;
    position: relative;
  }

  .main-content {
    flex: 1;
    min-width: 0; // Important for flex children
  }
  
  .right-sidebar {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel {
    background-color: var(--color-bg-2);
    border-radius: 4px;
    overflow: visible; /* Changed from auto to visible to prevent unnecessary scrollbars */
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.05);
  }
  
  .image-processing-panel {
    padding: 16px;
    margin-bottom: 16px;
  }

  // Add styles for the new control bar
  .control-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }

  // Apply consistent styling to all a-card components to match panel style
  :deep(.arco-card) {
    border-radius: 4px;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.05);
    overflow: visible; /* Added to prevent scrollbars */
  }
  
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    
    :deep(.arco-spin-tip) {
      font-size: 14px;
      margin-top: 12px;
    }
  }
</style>

<style lang="less" scoped>
  // responsive
  @media (max-width: 992px) {
    .container {
      flex-direction: column;
    }
    
    .right-sidebar {
      width: 100%;
    }
  }
  
  .mobile {
    .container {
      padding: 12px;
    }
  }
</style>
