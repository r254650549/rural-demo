<template>
  <div class="image-viewer">
    <a-modal
      v-model:visible="visible"
      :title="title"
      :footer="false"
      :mask-closable="true"
      :unmount-on-close="true"
      :width="1000"
      :top="50"
    >
      <div class="image-container">
        <img 
          ref="imageRef"
          :src="imageUrl" 
          class="enlarged-image" 
          :alt="title"
        />
      </div>
      <div class="modal-footer">
        <a-space>
          <a-button type="primary" @click="downloadImage">
            <template #icon><icon-download /></template>
            {{ $t('common.download') }}
          </a-button>
          <slot name="extraActions"></slot>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, defineExpose } from 'vue';
import { Message } from '@arco-design/web-vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  defaultFileName: {
    type: String,
    default: 'image'
  }
});

const visible = ref(false);
const imageUrl = ref('');
const imageRef = ref<HTMLImageElement | null>(null);

// Open the image viewer
const open = (url: string) => {
  imageUrl.value = url;
  visible.value = true;
};

// Download the current image
const downloadImage = async () => {
  if (!imageUrl.value) return;
  
  try {
    // 显示加载提示
    Message.loading('Preparing download...');
    
    // 使用 fetch API 获取图片作为 blob
    const response = await fetch(imageUrl.value);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const blob = await response.blob();
    
    // 创建一个临时的对象URL
    const objectUrl = URL.createObjectURL(blob);
    
    // 从原始URL中提取文件名，或使用默认文件名
    const urlParts = imageUrl.value.split('/');
    let fileName = urlParts[urlParts.length - 1] || `${props.defaultFileName}`;
    
    // 确保文件名有正确的扩展名
    if (!fileName.includes('.')) {
      // 根据blob的类型添加扩展名
      const fileExt = blob.type.split('/')[1] || 'jpg';
      fileName = `${fileName}.${fileExt}`;
    }
    
    // 创建下载链接并触发点击
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl); // 释放对象URL
      Message.success('Download started');
    }, 100);
  } catch (error) {
    console.error('Error downloading image:', error);
    Message.error('Failed to download image');
  }
};

// Close the image viewer
const close = () => {
  visible.value = false;
};

// Expose component methods to parent
defineExpose({
  open,
  close
});
</script>

<style lang="less" scoped>
.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 60vh;
  overflow: hidden;
  position: relative;
}

.enlarged-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.modal-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>