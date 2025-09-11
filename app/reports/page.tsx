// app/reports/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  User, 
  Building,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Folder,
  Clock,
  Share
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string;
  workspace?: {
    name: string;
  };
  creator?: {
    full_name: string;
  };
}

type SortBy = 'title' | 'created_at' | 'updated_at' | 'workspace';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<Array<{id: string; name: string}>>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchQuery, selectedWorkspace, sortBy, sortOrder]);

  const loadReports = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reports');
      }

      setReports(data.reports || []);

      // Extract unique workspaces
      const uniqueWorkspaces = Array.from(
        new Map(
          data.reports
            .filter((r: Report) => r.workspace?.name)
            .map((r: Report) => [r.workspace_id, { id: r.workspace_id, name: r.workspace?.name || 'Unknown' }])
        ).values()
      );
      setWorkspaces(uniqueWorkspaces);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReports = () => {
    let filtered = [...reports];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(query) ||
        report.content.toLowerCase().includes(query) ||
        report.workspace?.name?.toLowerCase().includes(query)
      );
    }

    // Filter by workspace
    if (selectedWorkspace !== 'all') {
      filtered = filtered.filter(report => report.workspace_id === selectedWorkspace);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        case 'workspace':
          aValue = a.workspace?.name?.toLowerCase() || '';
          bValue = b.workspace?.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  };

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const selectAllReports = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map(r => r.id));
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports?id=${reportId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete report');
      }

      setReports(prev => prev.filter(r => r.id !== reportId));
      setSelectedReports(prev => prev.filter(id => id !== reportId));

    } catch (err: any) {
      setError(err.message);
    }
  };

  const downloadReport = async (report: Report) => {
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html: report.content, 
          filename: report.title 
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.docx`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getWordCount = (content: string) => {
    const div = document.createElement('div');
    div.innerHTML = content;
    const text = div.textContent || div.innerText || '';
    return text.trim().split(/\s+/).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Reports</h1>
            <p className="text-slate-600 mt-2">
              {filteredReports.length} of {reports.length} reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="panel p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Workspace Filter */}
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="input w-full lg:w-48"
            >
              <option value="all">All Workspaces</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortBy, SortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="input w-full lg:w-48"
            >
              <option value="updated_at-desc">Latest Updated</option>
              <option value="updated_at-asc">Oldest Updated</option>
              <option value="created_at-desc">Newest Created</option>
              <option value="created_at-asc">Oldest Created</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="workspace-asc">Workspace A-Z</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-slate-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedReports.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {selectedReports.length} report{selectedReports.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReports([])}
                    className="btn btn-sm"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${selectedReports.length} selected reports?`)) {
                        selectedReports.forEach(deleteReport);
                      }
                    }}
                    className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reports */}
        {filteredReports.length === 0 ? (
          <div className="panel p-12 text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              {searchQuery || selectedWorkspace !== 'all' ? 'No reports found' : 'No reports yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || selectedWorkspace !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first report to get started with clinical documentation'
              }
            </p>
            {!searchQuery && selectedWorkspace === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Report
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredReports.map((report) => (
              <div key={report.id} className="panel hover:shadow-md transition-shadow relative group">
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={() => toggleReportSelection(report.id)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>

                {/* Menu Button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => setActiveMenu(activeMenu === report.id ? null : report.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {activeMenu === report.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                      <button
                        onClick={() => {
                          router.push(`/report/${report.id}`);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => {
                          downloadReport(report);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          deleteReport(report.id);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div 
                  className="cursor-pointer p-6 pt-12"
                  onClick={() => router.push(`/report/${report.id}`)}
                >
                  {/* Report Icon */}
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {report.title}
                  </h3>

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      <span>{report.workspace?.name || 'Personal'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatDate(report.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{getWordCount(report.content)} words</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                        onChange={selectAllReports}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </th>
                    <th 
                      className="text-left py-3 px-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        Title
                        {sortBy === 'title' && (
                          sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('workspace')}
                    >
                      <div className="flex items-center gap-2">
                        Workspace
                        {sortBy === 'workspace' && (
                          sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center gap-2">
                        Last Updated
                        {sortBy === 'updated_at' && (
                          sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4">Size</th>
                    <th className="text-right py-3 px-4 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.id)}
                          onChange={() => toggleReportSelection(report.id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => router.push(`/report/${report.id}`)}
                          className="text-left hover:text-emerald-600"
                        >
                          <div className="font-medium text-slate-900">{report.title}</div>
                          <div className="text-sm text-slate-500">
                            Created {formatDate(report.created_at)}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{report.workspace?.name || 'Personal'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(report.updated_at)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {getWordCount(report.content)} words
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/report/${report.id}`)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                            title="View report"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadReport(report)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                            title="Download report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg"
                            title="Delete report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Click outside to close menu */}
        {activeMenu && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setActiveMenu(null)}
          />
        )}
      </div>
    </div>
  );
}
