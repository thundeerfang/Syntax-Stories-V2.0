'use client';

import React from 'react';
import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  Plus,
  RefreshCw,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type HeaderVariant = 'work' | 'education' | 'certifications' | 'projects' | 'openSource';

type SettingsSectionHeaderProps = Readonly<{
  variant: HeaderVariant;
  onPrimaryAction: () => void;
  disabled?: boolean;
}>;

// Reusable Button Component based on the "Education" style you liked
const HeaderActionButton = ({ 
  onClick, 
  disabled, 
  icon: Icon, 
  label 
}: { 
  onClick: () => void; 
  disabled?: boolean; 
  icon: any; 
  label: string 
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'ss-settings-header-btn inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] h-fit self-start sm:self-center',
      disabled && 'opacity-50'
    )}
  >
    <span className="relative z-[1] inline-flex items-center gap-2">
      <Icon className="size-3.5" /> {label}
    </span>
  </button>
);

function HeaderWrapper({
  children,
  border = true,
}: Readonly<{
  children: React.ReactNode;
  border?: boolean;
}>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6',
        border && 'border-b-4 border-border mb-6'
      )}
    >
      {children}
    </header>
  );
}

export function SettingsSectionHeader({ variant, onPrimaryAction, disabled }: SettingsSectionHeaderProps) {
  if (variant === 'work') {
    return (
      <HeaderWrapper>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Briefcase className="size-6" /> Work Experience
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Professional history and career milestones.
          </p>
        </div>
        <HeaderActionButton 
          onClick={onPrimaryAction} 
          disabled={disabled} 
          icon={Plus} 
          label="Add Experience" 
        />
      </HeaderWrapper>
    );
  }

  if (variant === 'education') {
    return (
      <HeaderWrapper>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            <GraduationCap className="size-7" /> Education
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Academic background and qualifications.
          </p>
        </div>
        <HeaderActionButton 
          onClick={onPrimaryAction} 
          disabled={disabled} 
          icon={Plus} 
          label="Add Education" 
        />
      </HeaderWrapper>
    );
  }

  if (variant === 'certifications') {
    return (
      <HeaderWrapper>
        <div>
        
        <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
        <Award className="size-7" />
            Licenses & Certifications</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Technical licenses and industry credentials.
          </p>
        </div>
        <HeaderActionButton 
          onClick={onPrimaryAction} 
          disabled={disabled} 
          icon={Plus} 
          label="Issue License" 
        />
      </HeaderWrapper>
    );
  }

  if (variant === 'projects') {
    return (
      <HeaderWrapper>
        <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
        <FolderGit2 className="size-7" />
            Projects & Publications
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Open source builds, research papers, and case studies.
          </p>
        </div>
        <HeaderActionButton 
          onClick={onPrimaryAction} 
          disabled={disabled} 
          icon={Plus} 
          label="New Entry" 
        />
      </HeaderWrapper>
    );
  }

  if (variant === 'openSource') {
    return (
      <HeaderWrapper>
        <div className="flex items-center gap-4">
          <div className="size-12 bg-foreground text-background flex items-center justify-center border-2 border-border shadow-[3px_3px_0px_0px_var(--primary)]">
            <FolderGit2 className="size-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Open Source Sync</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Live synchronization with GitHub repositories.
            </p>
          </div>
        </div>
        <HeaderActionButton 
          onClick={onPrimaryAction} 
          disabled={disabled} 
          icon={RefreshCw} 
          label="Sync Repos" 
        />
      </HeaderWrapper>
    );
  }

  return null;
}