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
import { BlockShadowButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SettingsSectionHeading } from './SettingsSectionHeading';

type HeaderVariant = 'work' | 'education' | 'certifications' | 'projects' | 'openSource';

type SettingsSectionHeaderProps = Readonly<{
  variant: HeaderVariant;
  onPrimaryAction: () => void;
  disabled?: boolean;
}>;

const HeaderActionButton = ({
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
}) => (
  <BlockShadowButton
    type="button"
    onClick={onClick}
    disabled={disabled}
    variant="primary"
    size="sm"
    className="h-fit self-start px-4 py-2 sm:self-center"
  >
    <Icon className="size-3.5 shrink-0" />
    {label}
  </BlockShadowButton>
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
        border && 'border-b-4 border-border mb-6',
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
        <SettingsSectionHeading
          icon={<Briefcase />}
          title="Work Experience"
          description="Professional history and career milestones."
        />
        <HeaderActionButton onClick={onPrimaryAction} disabled={disabled} icon={Plus} label="Add Experience" />
      </HeaderWrapper>
    );
  }

  if (variant === 'education') {
    return (
      <HeaderWrapper>
        <SettingsSectionHeading
          icon={<GraduationCap />}
          title="Education"
          description="Academic background and qualifications."
        />
        <HeaderActionButton onClick={onPrimaryAction} disabled={disabled} icon={Plus} label="Add Education" />
      </HeaderWrapper>
    );
  }

  if (variant === 'certifications') {
    return (
      <HeaderWrapper>
        <SettingsSectionHeading
          icon={<Award />}
          title="Licenses & Certifications"
          description="Technical licenses and industry credentials."
        />
        <HeaderActionButton onClick={onPrimaryAction} disabled={disabled} icon={Plus} label="Issue License" />
      </HeaderWrapper>
    );
  }

  if (variant === 'projects') {
    return (
      <HeaderWrapper>
        <SettingsSectionHeading
          icon={<FolderGit2 />}
          title="Projects & Publications"
          description="Open source builds, research papers, and case studies."
        />
        <HeaderActionButton onClick={onPrimaryAction} disabled={disabled} icon={Plus} label="New Entry" />
      </HeaderWrapper>
    );
  }

  if (variant === 'openSource') {
    return (
      <HeaderWrapper>
        <SettingsSectionHeading
          icon={<FolderGit2 />}
          title="Open Source Sync"
          description="Live synchronization with GitHub repositories."
        />
        <HeaderActionButton onClick={onPrimaryAction} disabled={disabled} icon={RefreshCw} label="Sync Repos" />
      </HeaderWrapper>
    );
  }

  return null;
}
