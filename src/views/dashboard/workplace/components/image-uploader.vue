<template>
    <div class="image-uploader" 
         @dragenter.prevent="!uploading && handleDragEnter" 
         @dragleave.prevent="!uploading && handleDragLeave" 
         @dragover.prevent 
         @drop.prevent="!uploading && handleDrop">
        <a-card :title="$t('workplace.imageUploader.title')">
            <a-upload :file-list="fileList" :custom-request="customRequest" list-type="picture-card" multiple
                @change="handleChange" @preview="handlePreview" drag :disabled="uploading">
                <div class="upload-btn">
                    <icon-loading v-if="uploading" />
                    <icon-plus v-else />
                    <div class="upload-text">{{ uploading ? $t('workplace.imageUploader.uploading') : $t('workplace.imageUploader.uploadText') }}</div>
                    <div class="upload-drag-text" v-if="!uploading">{{ $t('workplace.imageUploader.dragText') }}</div>
                </div>
            </a-upload>
            <a-modal v-model:visible="visible" :title="$t('workplace.imageUploader.preview')" @cancel="handleCancel"
                footer-less>
                <img :src="previewImage" style="width: 100%" alt="preview" />
            </a-modal>

            <div class="operation-buttons">
                <a-button 
                    type="primary" 
                    @click="handleUpload" 
                    :loading="uploading"
                    :disabled="fileList.length === 0 || !hasFileChanges || uploading">
                    {{ $t('workplace.imageUploader.confirm') }}
                </a-button>
                <a-button @click="clearAll" :disabled="uploading">
                    {{ $t('workplace.imageUploader.clear') }}
                </a-button>
            </div>
        </a-card>
        
        <!-- Drag overlay -->
        <div v-if="isDragging" class="drag-overlay">
            <div class="drag-content">
                <icon-upload class="drag-icon" />
                <p>{{ $t('workplace.imageUploader.dropHere') }}</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { uploadImages } from '@/api/upload';
import { ref, defineEmits, computed } from 'vue';
import { Message } from '@arco-design/web-vue';
import type UploadItem from '@arco-design/web-vue';
import { useI18n } from 'vue-i18n'; // Import the useI18n composable

const {t:$t} = useI18n(); // Use the i18n instance

const props = defineProps({
    isGroundImagery: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits<{
    (e: 'imagesUploaded', images: File[], uploadResults?: any[]): void;
}>();

const fileList = ref<UploadItem[]>([]);
const visible = ref(false);
const previewImage = ref('');
const uploadResults = ref<any[]>([]);
const uploading = ref(false);
const lastUploadedFiles = ref<UploadItem[]>([]);
const uploadTaskName = ref('');

// Computed property to check if there are changes since last upload
const hasFileChanges = computed(() => {
    if (fileList.value.length !== lastUploadedFiles.value.length) {
        return true;
    }
    
    // Compare files by their unique identifiers
    const currentIds = fileList.value.map(file => file.uid);
    const lastUploadedIds = lastUploadedFiles.value.map(file => file.uid);
    
    return currentIds.some(id => !lastUploadedIds.includes(id)) || 
            lastUploadedIds.some(id => !currentIds.includes(id));
});

const customRequest = (options: any) => {   
    const { onSuccess, file } = options;
    // Just mark as success without actual upload
    setTimeout(() => {
        onSuccess();
    }, 100);
};

const handleChange = (files: UploadItem[]) => {
    fileList.value = files;
};

const handlePreview = (file: UploadItem) => {
    previewImage.value = file.url || '';
    visible.value = true;
};

const handleCancel = () => {
    visible.value = false;
};

const handleUpload = async () => {
    if (fileList.value.length === 0) {
        Message.warning($t('message.imageUploader.selectAtLeast'));
        return;
    }

    uploading.value = true;
    uploadResults.value = [];
    const files = fileList.value.map(item => item.file).filter(Boolean) as File[];
    
    try {
        // Use the extracted API function for uploading
        // Pass the isGroundImagery prop as an option if true
        const options = props.isGroundImagery ? { is_ground_image: true } : undefined;
        const response = await uploadImages(files, options);
        
        if (response && response.status === 200) {
            // Store results
            const result = response.data;
            uploadResults.value = [result];
            
            // If the API returns an array of uploaded file data
            if (result.data && Array.isArray(result.data)) {
                // Update file list with server data for multiple files
                fileList.value = fileList.value.map((item, index) => {
                    if (index < result.data.length) {
                        return {
                            ...item,
                            serverPath: result.data[index].path,
                            serverFilename: result.data[index].filename,
                            serverUrl: result.data[index].url,
                            status: 'done'
                        };
                    }
                    return item;
                });
            } else if (result.data) {
                // If the API returns a single file's data, apply to the first file only
                if (fileList.value.length > 0) {
                    fileList.value[0] = {
                        ...fileList.value[0],
                        serverPath: result.data.path,
                        serverFilename: result.data.filename,
                        serverUrl: result.data.url,
                        status: 'done'
                    };
                }
            }
            
            // Save the current file list as the last uploaded state
            lastUploadedFiles.value = JSON.parse(JSON.stringify(fileList.value));
            
            emit('imagesUploaded', files, [response]);
            Message.success($t('message.imageUploader.uploadSuccess', { count: files.length }));
        } else {
            throw new Error(response.data?.msg || $t('message.imageUploader.uploadFailed'));
        }
    } catch (error: any) {
        Message.error(error.message || $t('message.imageUploader.uploadFailed'));
    } finally {
        uploading.value = false;
    }
};

const clearAll = () => {
    fileList.value = [];
    lastUploadedFiles.value = [];
};

const setUploadedFiles = (imageData: any[], taskName?: string) => {
    // Clear existing files
    fileList.value = [];
    
    // 如果提供了 taskName，则更新 uploadTaskName
    if (taskName) {
        uploadTaskName.value = taskName;
    }
    
    // Convert image data to upload items
    const newFiles = imageData.map(item => {
        return {
            uid: Date.now() + Math.random().toString(36).substring(2),
            name: item.filename || 'image',
            status: 'done',
            url: item.url,
            serverPath: item.path,
            serverFilename: item.filename,
            serverUrl: item.url,
        };
    });
    
    // Set the file list
    fileList.value = newFiles;
    lastUploadedFiles.value = JSON.parse(JSON.stringify(newFiles));
    
    // If there are files, also emit the imagesUploaded event with the data
    if (newFiles.length > 0) {
        // Create a properly formatted result object that matches what the parent expects
        const result = {
            status: 200,
            data: {
                task_name: uploadTaskName.value || 'Continued upload',
                data: imageData
            }
        };
        
        // Store the results
        uploadResults.value = [result.data];
        
        // 创建实际的 File 对象数组，而不是传递空数组
        const files = imageData.map(item => {
            // 使用图片URL或文件名创建一个空的File对象
            const fileName = item.filename || 'image.jpg';
            const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            
            // 创建一个非空的File对象，以便通过父组件中的 `.length` 检查
            return new File(['placeholder'], fileName, { type: fileType });
        });
        
        // 发射事件，传递files和结果
        emit('imagesUploaded', files, [result]);
        
        console.log('Image uploader emitted imagesUploaded event with', imageData.length, 'images, task name:', uploadTaskName.value);
    }
};

const isDragging = ref(false);
let dragCounter = 0;

const handleDragEnter = (e: DragEvent) => {
    dragCounter += 1;
    isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
    dragCounter -= 1;
    if (dragCounter === 0) {
        isDragging.value = false;
    }
};

const handleDrop = (e: DragEvent) => {
    isDragging.value = false;
    dragCounter = 0;
    
    if (!e.dataTransfer?.files.length) return;
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
        Message.warning($t('message.imageUploader.onlyImage'));
        return;
    }
    
    // Add files to the upload list
    const newFiles = files.map(file => {
        return {
            uid: Date.now() + Math.random().toString(36).substring(2),
            name: file.name,
            file,
            status: 'done',
            url: URL.createObjectURL(file)
        };
    });
    
    fileList.value = [...fileList.value, ...newFiles];
    Message.success($t('message.imageUploader.addedImages', { count: files.length }));
};

// Expose methods to parent component
defineExpose({
    setUploadedFiles,
    clearAll,
    uploadTaskName
});
</script>

<style lang="less" scoped>
.image-uploader {
    margin-bottom: 20px;
    position: relative;
}

.upload-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.upload-text {
    margin-top: 8px;
    font-size: 14px;
    color: rgb(var(--gray-6));
}

.upload-drag-text {
    margin-top: 4px;
    font-size: 12px;
    color: rgb(var(--gray-5));
}

.operation-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(var(--primary-6), 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border: 2px dashed rgb(var(--primary-6));
    border-radius: 4px;
    pointer-events: none;
}

.drag-content {
    background-color: rgba(255, 255, 255, 0.9);
    padding: 20px 40px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.drag-icon {
    font-size: 32px;
    color: rgb(var(--primary-6));
    margin-bottom: 12px;
}
</style>
