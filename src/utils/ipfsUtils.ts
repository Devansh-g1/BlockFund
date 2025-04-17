
// Store image directly in Supabase and return URL instead of using IPFS
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

/**
 * Upload a file to Supabase Storage
 * @param file File to upload
 * @returns URL of the uploaded file
 */
export const uploadFileToStorage = async (file: File): Promise<string> => {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `campaign-images/${fileName}`;
    
    // First get storage buckets to see if our bucket exists
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    
    if (bucketListError) {
      console.error('Error listing storage buckets:', bucketListError);
      toast({
        title: "Storage Error",
        description: "Could not access storage. Please try again.",
        variant: "destructive"
      });
      throw new Error(`Failed to access storage: ${bucketListError.message}`);
    }
    
    // Check if bucket exists
    const bucketExists = buckets?.some(bucket => bucket.name === 'campaign-assets');
    
    // If bucket doesn't exist, create it - with explicit error handling
    if (!bucketExists) {
      console.log('Campaign assets bucket does not exist, creating...');
      
      try {
        const { error: createBucketError } = await supabase.storage.createBucket('campaign-assets', {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
          toast({
            title: "Storage Setup Failed",
            description: `Could not create storage: ${createBucketError.message}`,
            variant: "destructive"
          });
          throw new Error(`Failed to create storage bucket: ${createBucketError.message}`);
        }
        
        console.log('Campaign assets bucket created successfully');
      } catch (bucketCreationError: any) {
        console.error('Caught error during bucket creation:', bucketCreationError);
        toast({
          title: "Storage Error",
          description: bucketCreationError.message || "Failed to create storage for images",
          variant: "destructive"
        });
        throw new Error(`Storage setup failed: ${bucketCreationError.message || "Unknown error"}`);
      }
    }
    
    // Upload file to Supabase Storage with improved error handling
    console.log(`Uploading file ${filePath} to campaign-assets bucket...`);
    const { data, error: uploadError } = await supabase.storage
      .from('campaign-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting files with the same name
      });
    
    if (uploadError) {
      console.error('Error uploading file to Supabase Storage:', uploadError);
      toast({
        title: "Upload Failed",
        description: `Failed to upload file: ${uploadError.message}`,
        variant: "destructive"
      });
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }
    
    console.log('File uploaded successfully, getting public URL...');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('campaign-assets')
      .getPublicUrl(filePath);
    
    console.log('Image URL generated:', publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error('Error in uploadFileToStorage:', error);
    toast({
      title: "Upload Error",
      description: error.message || "Failed to upload file",
      variant: "destructive"
    });
    throw new Error('Failed to upload file: ' + (error.message || "Unknown error"));
  }
};

// Rest of functions 
/**
 * Upload multiple files to Supabase Storage
 * @param files Array of files to upload
 * @returns Array of URLs
 */
export const uploadFilesToStorage = async (files: File[]): Promise<string[]> => {
  try {
    if (!files || files.length === 0) return [];
    
    const promises = files.map(file => uploadFileToStorage(file));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error uploading files:', error);
    throw new Error('Failed to upload files');
  }
};

// Legacy IPFS functions for backward compatibility
export const uploadFileToIPFS = uploadFileToStorage;
export const uploadFilesToIPFS = uploadFilesToStorage;

/**
 * Upload campaign data to Storage
 * @param campaignData Campaign data object
 * @returns URL of the campaign data
 */
export const uploadCampaignDataToIPFS = async (campaignData: any): Promise<string> => {
  try {
    // Convert campaign data to JSON string
    const jsonString = JSON.stringify(campaignData);
    
    // Create a file from the JSON string
    const file = new File([jsonString], 'campaign-data.json', { type: 'application/json' });
    
    // Upload file to Supabase Storage
    return await uploadFileToStorage(file);
  } catch (error) {
    console.error('Error uploading campaign data:', error);
    throw new Error('Failed to upload campaign data');
  }
};

/**
 * Fetch data from IPFS or Storage
 * @param url URL of the data
 * @returns Fetched data
 */
export const fetchFromIPFS = async (url: string): Promise<any> => {
  try {
    // Use HTTP fetch to get the data
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    
    // Check if it's JSON data
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Otherwise return as text
    return await response.text();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw new Error('Failed to fetch data');
  }
};

// Helper for reading files (kept for backward compatibility)
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
