# Personal Learning Tracker

A minimalist, high-performance web application designed to organize learning materials, study notes, and image-based study resources.

## Why I Built This
During self-study sessions (such as reading manual books, textbooks, or writing handwritten summaries), there is a constant friction between the physical page and digital storage. I needed a tool to:
- Quickly capture handwritten summaries using a smartphone camera.
- Keep resources organized in simple, subject-based folders.
- Read notes easily in a clean, distraction-free dark interface without non-professional clutter (no emojis, outline icons only).
- Access the tool instantly on mobile like a native app.

To keep running costs at zero and eliminate server maintenance, the application is built using a Serverless/BaaS (Backend-as-a-Service) architecture combining Next.js with Supabase.

## Features
- **Sleek Dark Mode:** Styled using a deep Zinc palette focused on readability.
- **Folder Categorization:** Simple CRUD controls in the sidebar to group materials into custom directories.
- **Structured Notes:** Each entry supports a title, text summaries, and multiple image attachments.
- **Frontend Image Compression:** Photos are compressed directly in the browser to under 1MB before uploading. This saves bandwidth and keeps database storage utilization low.
- **Camera Integration:** Directly capture notes on mobile devices with the built-in rear camera trigger.
- **Note Details & Image Zoom:** Click notes to read full text in a focus modal, or click image thumbnails to open a fullscreen lightbox.
- **Storage Garbage Collection:** Removing a note or deleting an attachment during edit automatically deletes the physical file from Supabase Storage to prevent orphaned assets.
- **Progressive Web App (PWA):** Installs directly onto iOS and Android homescreens with standalone, fullscreen execution.
- **Security:** Secure authentication and Row Level Security (RLS) policies implemented at the database level to protect private notes.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database, Auth & Storage:** Supabase
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Image Processing:** browser-image-compression
