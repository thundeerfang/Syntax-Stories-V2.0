'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { blogApi, pickRemoteThumbnailForApi } from '@/api/blog';
import { BlogWritePageSkeletonInner } from '@/components/skeletons';
import { 
  Save, Send, ChevronRight, FileCode, 
  Activity, Cpu, History, Terminal as TerminalIcon,
  Globe, ShieldCheck, Box
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BlogWriteEditor, Block, createBlockInSection, stripLegacyGifBlocks } from '@/components/ui/BlogWriteEditor';

const TITLE_MAX = 300;
/** Single section for /write (no section UI); must match how editor filters blocks. */
const WRITE_DEFAULT_SECTION_ID = 's-1';

export default function WriteBlogPage() {
  const { user, token, shouldBlock } = useRequireAuth();
  const { isOpen } = useSidebar();
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(() => [createBlockInSection('paragraph', WRITE_DEFAULT_SECTION_ID)]);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'published' | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!title.trim()) { toast.error('ERROR: TITLE_REQUIRED'); return; }
    if (!token) return;
    setSubmitting(true);
    setSubmitAction(status);
    try {
      const content = JSON.stringify(stripLegacyGifBlocks(blocks));
      await blogApi.createPost(
        {
          title,
          content,
          thumbnailUrl: pickRemoteThumbnailForApi(thumbnailUrl.trim() || undefined),
          status,
        },
        token,
      );
      toast.success(status === 'published' ? 'POST_LIVE' : 'DRAFT_SYNCED');
      if (status === 'published') { setTitle(''); setBlocks([createBlockInSection('paragraph', WRITE_DEFAULT_SECTION_ID)]); }
    } catch (err) {
      console.error(err);
      toast.error('FATAL: UPLOAD_FAILED');
    } finally {
      setSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (shouldBlock) return <BlogWritePageSkeletonInner />;

  return (
    <div
      className={cn(
        'min-h-screen bg-background pb-10 font-mono text-foreground transition-all duration-300',
        isOpen ? 'lg:ml-64' : 'ml-0',
      )}
    >
      <div className="w-full">
      {/* 1. TOP SYSTEM NAV */}
      <div className="border-b-2 border-border bg-card py-2 flex items-center justify-between shadow-[0_2px_0_0_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-1 border-2 border-black">
            <TerminalIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
            <span>Workspace</span>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="text-primary">{user?.username || 'user'}</span>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="bg-muted px-2 border border-border">new_entry.log</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground">
          <div className="flex items-center gap-2">
             <Activity className="h-3 w-3 text-green-500 animate-pulse" />
             <span>Uptime: 99.9%</span>
          </div>
          <div className="hidden min-w-[5.5rem] tabular-nums md:block">{currentTime || '\u00a0'}</div>
        </div>
      </div>

      {/* 2. MAIN WORKBENCH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-45px)]">
        
        {/* LEFT PANEL: File Stats & Navigator (fills left space) */}
        <div className="hidden lg:flex lg:col-span-2 border-r-2 border-border bg-muted/20 flex-col p-0 space-y-0">
          <section>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5" /> Project_Files
            </h3>
            <div className="space-y-1">
              {['content.json', 'assets.lib', 'metadata.env'].map(file => (
                <div key={file} className="text-[11px] py-1 px-2 border border-transparent hover:border-border hover:bg-card cursor-pointer transition-all flex items-center gap-2">
                  <Box className="h-3 w-3 text-primary" /> {file}
                </div>
              ))}
            </div>
          </section>

          <section className="pt-6 border-t border-border/10">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" /> Stats
            </h3>
            <div className="bg-black/5 p-3 border-2 border-border space-y-2">
               <div className="flex justify-between text-[9px]"><span>Blocks:</span> <span className="text-primary">{blocks.length}</span></div>
               <div className="flex justify-between text-[9px]"><span>Words:</span> <span className="text-primary">~{blocks.length * 12}</span></div>
               <div className="w-full bg-border h-1 mt-2"><div className="bg-primary h-full w-2/3"></div></div>
            </div>
          </section>
        </div>

        {/* MIDDLE PANEL: The Editor Core (Focus Area) */}
        <div className="lg:col-span-7 bg-background px-0 py-4 md:px-0 md:py-8 overflow-y-auto">
          <div className="w-full">
             <div className="mb-8 relative">
               <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">H1</span>
               <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="INPUT_TITLE_HERE..."
                className="w-full bg-transparent border-b-4 border-border text-4xl md:text-5xl font-black uppercase tracking-tighter focus:outline-none focus:border-primary placeholder:opacity-10 py-4 resize-none"
                rows={2}
               />
             </div>

             <BlogWriteEditor
               blocks={blocks}
               onBlocksChange={setBlocks}
               token={token ?? null}
               currentUserUsername={user?.username}
               isSidebarOpen={isOpen}
               maxWidthClassName="max-w-full"
               activeSectionId={WRITE_DEFAULT_SECTION_ID}
             />
          </div>
        </div>

        {/* RIGHT PANEL: Meta & Actions (fills right space) */}
        <div className="lg:col-span-3 border-l-2 border-border bg-card flex flex-col p-0 space-y-0">
          
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border pb-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Publish_Control
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleSubmit('published')}
                disabled={submitting}
                className="group relative bg-primary text-primary-foreground border-2 border-black p-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" /> {submitAction === 'published' ? 'Deploying...' : 'Deploy_Post'}
                </div>
              </button>
              
              <button
                onClick={() => handleSubmit('draft')}
                disabled={submitting}
                className="bg-muted border-2 border-border p-3 font-black uppercase text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all hover:bg-card"
              >
                <div className="flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> {submitAction === 'draft' ? 'Saving...' : 'Save_Local'}
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border pb-2">
              <Globe className="h-4 w-4 text-primary" /> Asset_Configuration
            </h3>
            <div>
              <input
                id="write-thumbnail-url"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://source.unsplash.com/..."
                className="w-full bg-background border-2 border-border p-2 mt-1 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </div>
            {thumbnailUrl && (
              <div className="aspect-video border-2 border-border overflow-hidden bg-black">
                 <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover opacity-70" />
              </div>
            )}
          </div>

          <div className="mt-auto bg-muted/50 p-4 border-2 border-border border-dashed">
            <h4 className="text-[9px] font-black uppercase mb-2 flex items-center gap-2">
               <History className="h-3 w-3" /> Revision_History
            </h4>
            <div className="space-y-2 opacity-50">
               <div className="text-[8px] flex justify-between italic"><span>v1.0.2 - Initial</span> <span>12:40</span></div>
               <div className="text-[8px] flex justify-between italic"><span>v1.0.3 - Layout</span> <span>12:45</span></div>
            </div>
          </div>

        </div>
      </div>
      </div>

      {/* 3. CONSOLE FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-black border-t-2 border-border flex items-center px-4 z-[60] lg:ml-0">
         <div className="flex gap-4 items-center w-full">
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               SYSTEM_STABLE
            </div>
            <div className="text-[9px] text-muted-foreground font-mono truncate">
              {`LOG: User "${user?.username ?? ''}" initiated write sequence... payload size ${JSON.stringify(blocks).length} bytes...`}
            </div>
         </div>
      </div>
    </div>
  );
}
