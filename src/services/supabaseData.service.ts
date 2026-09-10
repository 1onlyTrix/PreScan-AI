import { supabase } from '../supabaseClient';
import { Scan, Project, Report, Finding } from '../types/models';

export const SupabaseDataService = {
  // ==================== PROJECTS ====================
  async getProjects(): Promise<Project[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects from Supabase:', error);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      organizationId: p.organization_id || 'default',
      name: p.name,
      description: p.description,
      defaultLanguage: p.default_language || 'en',
      color: p.color || '#10B981',
      createdById: p.user_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  async createProject(project: { name: string; description?: string; color?: string; defaultLanguage?: string }): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create a project');

    const payload = {
      user_id: user.id,
      name: project.name,
      description: project.description || '',
      color: project.color || '#10B981',
      default_language: project.defaultLanguage || 'en',
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId: data.organization_id || 'default',
      name: data.name,
      description: data.description,
      defaultLanguage: data.default_language,
      color: data.color,
      createdById: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateProject(id: string, updates: Partial<{ name: string; description: string; color: string }>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.color !== undefined) payload.color = updates.color;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async deleteProject(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ==================== SCANS ====================
  async getScans(): Promise<Scan[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scans from Supabase:', error);
      return [];
    }

    return (data || []).map((s) => ({
      id: s.id,
      organizationId: 'default',
      projectId: s.project_id,
      title: s.title,
      description: s.description,
      category: s.category,
      tags: s.tags || [],
      madeForKids: s.made_for_kids,
      language: s.language,
      status: s.status,
      config: s.config || {},
      sourceType: s.source_type,
      source: s.source,
      mediaInfo: s.media_info,
      progressPercent: s.progress_percent || 0,
      overallRisk: s.overall_risk || 'LOW',
      initiatedById: s.user_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  },

  async createScan(scan: Partial<Scan>): Promise<Scan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create a scan');

    const payload = {
      user_id: user.id,
      project_id: scan.projectId || null,
      title: scan.title || 'Untitled Scan',
      description: scan.description || '',
      category: scan.category || 'Entertainment',
      tags: scan.tags || [],
      made_for_kids: scan.madeForKids || false,
      language: scan.language || 'en',
      status: scan.status || 'READY_FOR_ANALYSIS',
      config: scan.config || {},
      source_type: scan.sourceType || 'file',
      source: scan.source || {},
      media_info: scan.mediaInfo || {},
      overall_risk: scan.overallRisk || 'LOW',
      progress_percent: scan.progressPercent || 100,
    };

    const { data, error } = await supabase
      .from('scans')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId: 'default',
      projectId: data.project_id,
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      madeForKids: data.made_for_kids,
      language: data.language,
      status: data.status,
      config: data.config || {},
      sourceType: data.source_type,
      source: data.source,
      mediaInfo: data.media_info,
      progressPercent: data.progress_percent || 0,
      overallRisk: data.overall_risk || 'LOW',
      initiatedById: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateScan(id: string, updates: Partial<Scan>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.overallRisk !== undefined) payload.overall_risk = updates.overallRisk;
    if (updates.progressPercent !== undefined) payload.progress_percent = updates.progressPercent;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('scans')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async deleteScan(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ==================== REPORTS ====================
  async getReports(): Promise<Report[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports from Supabase:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      scanId: r.scan_id,
      organizationId: 'default',
      videoId: r.scan_id,
      summaryText: r.summary_text || '',
      communityGuidelinesRisk: r.community_guidelines_risk || 'LOW',
      advertiserSuitabilityRisk: r.advertiser_suitability_risk || 'LOW',
      copyrightSignalsRisk: r.copyright_signals_risk || 'LOW',
      metadataIntegrityRisk: r.metadata_integrity_risk || 'LOW',
      totalFindingsCount: r.total_findings_count || 0,
      importantCount: r.important_count || 0,
      reviewRequiredCount: r.review_required_count || 0,
      lowRiskCount: r.low_risk_count || 0,
      shareableToken: r.shareable_token,
      isPubliclyShared: r.is_publicly_shared || false,
      generatedAt: r.generated_at,
      updatedAt: r.updated_at,
    }));
  },

  async createReport(report: Partial<Report>): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create a report');

    const payload = {
      scan_id: report.scanId,
      user_id: user.id,
      summary_text: report.summaryText || 'Scan completed successfully.',
      community_guidelines_risk: report.communityGuidelinesRisk || 'LOW',
      advertiser_suitability_risk: report.advertiserSuitabilityRisk || 'LOW',
      copyright_signals_risk: report.copyrightSignalsRisk || 'LOW',
      metadata_integrity_risk: report.metadataIntegrityRisk || 'LOW',
      total_findings_count: report.totalFindingsCount || 0,
      important_count: report.importantCount || 0,
      review_required_count: report.reviewRequiredCount || 0,
      low_risk_count: report.lowRiskCount || 0,
    };

    const { data, error } = await supabase
      .from('reports')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      scanId: data.scan_id,
      organizationId: 'default',
      videoId: data.scan_id,
      summaryText: data.summary_text,
      communityGuidelinesRisk: data.community_guidelines_risk,
      advertiserSuitabilityRisk: data.advertiser_suitability_risk,
      copyrightSignalsRisk: data.copyright_signals_risk,
      metadataIntegrityRisk: data.metadata_integrity_risk,
      totalFindingsCount: data.total_findings_count,
      importantCount: data.important_count,
      reviewRequiredCount: data.review_required_count,
      lowRiskCount: data.low_risk_count,
      isPubliclyShared: data.is_publicly_shared,
      generatedAt: data.generated_at,
      updatedAt: data.updated_at,
    };
  },
};
