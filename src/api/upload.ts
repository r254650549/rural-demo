import axios from 'axios';
import { getBaseURL } from '@/utils/env';

// Get the base API URL from environment configuration
const baseURL = getBaseURL();

/**
 * Upload multiple image files to the server
 * @param files - Array of files to upload
 * @param options - Additional options for upload
 * @returns Promise with the server response
 */
export function uploadImages(
  files: File[],
  options?: { is_ground_image?: boolean }
) {
  // Create a single FormData with all files
  const formData = new FormData();

  // Append all files with the same field name
  files.forEach((file) => {
    formData.append('file', file);
  });

  // Add additional options if provided
  if (options?.is_ground_image) {
    formData.append('is_ground_image', 'true');
  }

  // Make a single API call with all files
  return axios.post(`${baseURL}/upload/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
}

/**
 * Upload multiple video files to the server
 * @param files - Array of video files to upload
 * @returns Promise with the server response
 */
export function uploadVideos(files: File[]) {
  // Create a single FormData with all files
  const formData = new FormData();

  // Append all files with the same field name
  files.forEach((file) => {
    formData.append('file', file);
  });
  console.log('Uploading videos:', files, formData);
  // Make a single API call with all files
  return axios.post(`${baseURL}/upload/video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
}

/**
 * Process previously uploaded ground images
 * @param imagePaths - Array of paths to uploaded ground images
 * @param taskName - Optional custom task name
 * @param parameters - Optional parameters for the processing algorithm
 * @param uploadEventName - Name of the upload event to associate with this task
 * @returns Promise with the server response
 */
export function processGroundImages(
  imagePaths: string[],
  taskName?: string,
  parameters?: string,
  uploadEventName?: string
) {
  return axios.post(
    `${baseURL}/image-target-extractor`,
    {
      image_paths: imagePaths,
      task_name: taskName,
      algorithm_type: parameters,
      upload_event_name: uploadEventName,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
}

/**
 * Process previously uploaded videos with annotation coordinates
 * @param videoPath - Path to the uploaded video
 * @param annotationLine - Line coordinates for annotation {startX, startY, endX, endY}
 * @param taskName - Optional custom task name
 * @param extractionType - Type of extraction to perform
 * @param parameters - Optional additional parameters for the processing algorithm
 * @returns Promise with the server response
 */
export function processGroundVideo(
  videoPath: string,
  annotationLine: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  },
  taskName?: string,
  extractionType?: string,
  parameters?: string
) {
  return axios.post(
    `${baseURL}/video-processor`,
    {
      video_paths: [videoPath],
      line_coordinates: annotationLine,
      task_name: taskName || 'Ground Video Processing',
      extraction_type: extractionType || 'objects',
      algorithm_type: parameters || 'ground',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
}
