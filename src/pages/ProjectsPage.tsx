import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, FolderPlus, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SupabaseDataService } from '../services/supabaseData.service';
import { Project } from '../types/models';

interface ProjectsPageProps {
  onNavigate: (route: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await SupabaseDataService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setSubmitting(true);
      const newProj = await SupabaseDataService.createProject({
        name: projectName.trim(),
        description: projectDesc.trim(),
      });
      setProjects((prev) => [newProj, ...prev]);
      setProjectName('');
      setProjectDesc('');
      setIsCreating(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create project in Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await SupabaseDataService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete project.');
    }
  };

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
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : 'New Project'}
          </Button>
        }
      />

      {isCreating && (
        <Card className="bg-white border-neutral-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-neutral-900">Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label="Project Name"
                placeholder="e.g., Tech Reviews Channel, Summer Series 2026"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="Optional channel or playlist context"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Save Project to Supabase
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-500 font-mono">Loading projects from Supabase...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<FolderKanban className="w-6 h-6" />}
            badgeText="Workspace Hierarchy"
            title="No projects configured"
            description="Projects allow you to group related video uploads by channel, series format, or season with customized review sensitivity rules."
            primaryAction={{
              label: '+ Create First Project',
              onClick: () => setIsCreating(true),
              icon: <Plus className="w-4 h-4" />,
            }}
            secondaryAction={{
              label: 'Run Direct Scan Instead',
              onClick: () => onNavigate('/app/new-scan'),
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="bg-white border-neutral-200 hover:border-neutral-900 transition-all">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color || '#10B981' }}
                  />
                  <CardTitle className="text-base font-bold text-neutral-900">{p.name}</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteProject(p.id, e)}
                  className="p-1 text-neutral-400 hover:text-red-600 rounded"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-neutral-500 mb-3">{p.description || 'No description provided.'}</p>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
