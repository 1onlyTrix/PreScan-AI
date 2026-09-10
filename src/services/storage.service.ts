import { supabase } from '../supabaseClient';

export interface UploadResult {
  path: string;
  fullPath: string;
  signedUrl: string;
}

export const StorageService = {
  /**
   * Upload a file to the private Supabase Storage bucket "app-files".
   * Folder structure: ${user.id}/${featureName}/${itemId}/${uuid}-${fileName}
   */
  async uploadFile(file: File, featureName: string, itemId: string = 'general'): Promise<UploadResult> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User must be authenticated to upload files.');
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${featureName}/${itemId}/${crypto.randomUUID()}-${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from('app-files')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Since 'app-files' is private, generate a signed URL for display/access
    const signedUrl = await this.getSignedUrl(data.path);

    return {
      path: data.path,
      fullPath: data.path,
      signedUrl,
    };
  },

  /**
   * Generate a signed URL for viewing/downloading private files in 'app-files'.
   */
  async getSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    const cleanPath = filePath.replace(/^app-files\//, '');
    const { data, error } = await supabase.storage
      .from('app-files')
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Failed to generate signed URL:', error);
      return '';
    }

    return data.signedUrl;
  },

  /**
   * Delete a file from the private Supabase Storage bucket 'app-files'.
   */
  async deleteFile(filePath: string): Promise<void> {
    const cleanPath = filePath.replace(/^app-files\//, '');
    const { error } = await supabase.storage
      .from('app-files')
      .remove([cleanPath]);

    if (error) {
      console.error('Failed to delete file from Supabase storage:', error);
      throw error;
    }
  },
};
