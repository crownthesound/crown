/*
  # Add meta image storage configuration

  1. Storage Configuration
    - Creates 'meta-images' bucket for storing meta images
    - Sets bucket to public for easy access
    - Configures file size limits and allowed MIME types
  
  2. Security
    - Enables organizers to upload meta images
    - Allows public access to view meta images
*/

-- Create the storage bucket
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'meta-images',
        'meta-images',
        true,
        5242880, -- 5MB in bytes
        ARRAY[
          'image/jpeg',
          'image/png',
          'image/webp'
        ]
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policy to allow organizers to upload files
DO $$
BEGIN
    DROP POLICY IF EXISTS "Organizers can upload meta images" ON storage.objects;
    CREATE POLICY "Organizers can upload meta images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'meta-images'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'organizer'
        )
    );
END $$;

-- Policy to allow public access to view files
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public users can view meta images" ON storage.objects;
    CREATE POLICY "Public users can view meta images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'meta-images');
END $$;