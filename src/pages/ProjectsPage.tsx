import React from 'react';
import { FolderKanban, Plus, FolderPlus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumb } from '../components/ui/Breadcrumb';

interface ProjectsPageProps {
  onNavigate: (route: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Series"
        description="Organize your YouTube channels, recurring series, or sponsored video campaigns into isolated projects."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Projects' },
            ]}
          />
        }
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<FolderPlus className="w-4 h-4" />}
            disabled
          >
            New Project
          </Button>
        }
      />

      {/* Honest Empty State */}
      <div className="py-12">
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          badgeText="Workspace Hierarchy"
          title="No projects configured"
          description="Projects allow you to group related video uploads by channel, series format, or season with customized review sensitivity rules."
          primaryAction={{
            label: '+ Create First Project',
            onClick: () => {},
            icon: <Plus className="w-4 h-4" />,
          }}
          secondaryAction={{
            label: 'Run Direct Scan Instead',
            onClick: () => onNavigate('/app/new-scan'),
          }}
        />
      </div>
    </div>
  );
};
