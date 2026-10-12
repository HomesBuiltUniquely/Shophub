'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import {
  getAllPrimaryCategories,
  getAllSecondaryCategories,
  getCategoriesByPrimary,
  createPrimaryCategory,
  createSecondaryCategory,
  createSubCategory,
  updatePrimaryCategory,
  updateSecondaryCategory,
  getPrimaryCategoryById,
  getSecondaryCategoryById,
  deletePrimaryCategory,
  deleteSecondaryCategory,
} from '@/lib/api/category.service';

interface TreeNode {
  id: string; // e.g. "p-1", "s-1", "sub-1"
  numericId: number;
  type: 'primary' | 'secondary' | 'sub';
  name: string;
  description?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  productCount?: number;
  children?: TreeNode[];
  parentId?: number;
  primaryId?: number;
  breadcrumb?: string;
  pathNames?: string[];
  icon?: string;
  imageUrl?: string;
  iconUrl?: string;
}

function toBreadcrumb(names: string[]) {
  return names.map((name) => name.trim().toUpperCase()).filter(Boolean).join(' > ');
}

function levelLabel(type: TreeNode['type']) {
  return type === 'primary' ? 'Primary' : 'Secondary';
}

function trailTo(nodes: TreeNode[], id: string): TreeNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const nested = trailTo(node.children || [], id);
    if (nested.length) return [node, ...nested];
  }
  return [];
}

const CATEGORY_ICON_KEY = 'shophub_category_icons';

function readCategoryIcons(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CATEGORY_ICON_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCategoryIcon(id: string, url: string) {
  const next = readCategoryIcons();
  if (url) next[id] = url;
  else delete next[id];
  localStorage.setItem(CATEGORY_ICON_KEY, JSON.stringify(next));
}

function applyIcons(nodes: TreeNode[], icons: Record<string, string>): TreeNode[] {
  return nodes.map((node) => ({
    ...node,
    iconUrl: icons[node.id] || node.iconUrl || node.imageUrl || '',
    children: applyIcons(node.children || [], icons),
  }));
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageSize(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(`${img.naturalWidth}×${img.naturalHeight}`);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve('');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function mapSecondary(
  cat: any,
  ancestors: string[] = [],
  type: TreeNode['type'] = 'secondary',
  primaryId?: number
): TreeNode {
  const id = Number(cat.secondaryCategoryId ?? cat.id ?? 0);
  const name = cat.secondaryCategoryName || cat.name || 'Category';
  const nested = Array.isArray(cat.subCategory) ? cat.subCategory : [];
  const parentPrimary = Number(cat.primaryCategoryId ?? primaryId ?? 0) || undefined;
  const pathNames = [...ancestors, name];
  return {
    id: `${type === 'sub' ? 'sub' : 's'}-${id}`,
    numericId: id,
    type,
    name,
    description: cat.secondaryCategoryDescription || cat.description || '',
    slug: cat.seo?.url_slug || slugify(name),
    metaTitle: cat.seo?.page_title || '',
    metaDescription: cat.seo?.meta_desc || '',
    tags: cat.internalTags || cat.seo?.keywords || [],
    imageUrl: cat.imageUrl || '',
    primaryId: parentPrimary,
    productCount: Array.isArray(cat.products) ? cat.products.length : undefined,
    pathNames,
    breadcrumb: toBreadcrumb(pathNames),
    children: nested.map((child: any) => mapSecondary(child, pathNames, 'sub', parentPrimary)),
  };
}

function parentSecondaryId(cat: any) {
  return Number(
    cat.parent_scat_id ??
      cat.parentScatId ??
      cat.parentSecondaryCategoryId ??
      cat.parentId ??
      cat.parent_secondary_category_id ??
      cat.parent?.secondaryCategoryId ??
      cat.parent?.scatId ??
      0
  );
}

function nestSecondaries(list: any[], ancestors: string[], primaryId: number): TreeNode[] {
  const byParent = new Map<number, any[]>();
  const roots: any[] = [];
  for (const item of list) {
    const parentId = parentSecondaryId(item);
    if (parentId) {
      const kids = byParent.get(parentId) || [];
      kids.push(item);
      byParent.set(parentId, kids);
    } else {
      roots.push(item);
    }
  }

  const mapNode = (cat: any, path: string[], type: TreeNode['type']): TreeNode => {
    const node = mapSecondary(cat, path, type, primaryId);
    const extra = byParent.get(node.numericId) || [];
    const nested = [...(node.children || []), ...extra.map((child) => mapNode(child, node.pathNames || path, 'sub'))];
    const seen = new Set<number>();
    node.children = nested.filter((child) => {
      if (!child.numericId || seen.has(child.numericId)) return false;
      seen.add(child.numericId);
      return true;
    });
    return node;
  };

  return roots.map((item) => mapNode(item, ancestors, 'secondary'));
}

function mapPrimary(cat: any, secondaries: any[] = []): TreeNode {
  const id = Number(cat.primaryCategoryId ?? cat.id ?? 0);
  const name = cat.primaryCategoryName || cat.name || 'Category';
  const pathNames = [name];
  const source = secondaries.length ? secondaries : cat.subCategory || [];
  const kids = nestSecondaries(source, pathNames, id);
  return {
    id: `p-${id}`,
    numericId: id,
    type: 'primary',
    name,
    icon: 'folder',
    description: cat.primaryCategoryDescription || cat.description || '',
    slug: cat.seo?.url_slug || slugify(name),
    metaTitle: cat.seo?.page_title || '',
    metaDescription: cat.seo?.meta_desc || '',
    tags: cat.internalTags || cat.seo?.keywords || [],
    imageUrl: cat.imageUrl || '',
    productCount: Array.isArray(cat.products) ? cat.products.length : undefined,
    pathNames,
    breadcrumb: toBreadcrumb(pathNames),
    children: kids,
  };
}

export default function CategoriesPage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Tree expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Selected Category
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // Form Edit State
  const [categoryName, setCategoryName] = useState('');
  const [urlSlug, setUrlSlug] = useState('');
  const [description, setDescription] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Category Asset
  const [assetFile, setAssetFile] = useState<{
    name: string;
    size: string;
    dimensions: string;
  } | null>(null);

  // Feedback & Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [creatingUnder, setCreatingUnder] = useState<TreeNode | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCategories = useCallback(async (selectId?: string) => {
    setIsLoadingTree(true);
    try {
      const [primaries, allSecondaries] = await Promise.all([
        getAllPrimaryCategories(),
        getAllSecondaryCategories(),
      ]);
      const grouped = new Map<number, any[]>();
      const collect = (items: any[], primaryHint?: number) => {
        for (const s of items || []) {
          const pid = Number(
            s.primaryCategoryId ??
              s.primary_category_id ??
              s.primaryCategory?.primaryCategoryId ??
              primaryHint ??
              0
          );
          if (pid) {
            const list = grouped.get(pid) || [];
            list.push({ ...s, primaryCategoryId: pid, subCategory: undefined });
            grouped.set(pid, list);
          }
          if (Array.isArray(s.subCategory)) collect(s.subCategory, pid || primaryHint);
        }
      };
      collect(allSecondaries as any[]);
      const tree = await Promise.all(
        primaries.map(async (primary) => {
          const id = primary.primaryCategoryId;
          const nested = Array.isArray(primary.subCategory) ? primary.subCategory : [];
          let secondaries = nested.length ? nested : id != null ? await getCategoriesByPrimary(id) : [];
          if (!secondaries.length && id != null) secondaries = grouped.get(Number(id)) || [];
          return mapPrimary(primary, secondaries);
        })
      );
      const withIcons = applyIcons(tree, readCategoryIcons());
      setTreeData(withIcons);
      setExpandedNodes((prev) => {
        const next = { ...prev };
        tree.forEach((node) => {
          if (next[node.id] === undefined) next[node.id] = true;
        });
        return next;
      });
      const flatten = (nodes: TreeNode[]): TreeNode[] =>
        nodes.flatMap((node) => [node, ...flatten(node.children || [])]);
      const flat = flatten(withIcons);
      const chosen = (selectId && flat.find((n) => n.id === selectId)) || flat[0] || null;
      if (chosen) {
        setSelectedNode(chosen);
        setCategoryName(chosen.name);
        setUrlSlug(chosen.slug || slugify(chosen.name));
        setDescription(chosen.description || '');
        setMetaTitle(chosen.metaTitle || '');
        setMetaDescription(chosen.metaDescription || '');
        setTags(chosen.tags || []);
        setImageUrl(chosen.imageUrl || '');
        setIconUrl(chosen.iconUrl || '');
        setAssetFile(chosen.imageUrl ? { name: chosen.imageUrl.split('/').pop() || 'image', size: '', dimensions: '' } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load categories');
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const writePayload = () => ({
    name: categoryName.trim(),
    description: description.trim(),
    imageUrl,
    seo: {
      page_title: metaTitle.trim() || categoryName.trim(),
      meta_desc: metaDescription.trim() || description.trim(),
      url_slug: urlSlug.trim() || slugify(categoryName),
      keywords: tags,
    },
    internalTags: tags,
  });

  const applyNodeToForm = (node: TreeNode) => {
    setCreatingUnder(null);
    setSelectedNode(node);
    setCategoryName(node.name);
    setUrlSlug(node.slug || slugify(node.name));
    setDescription(node.description || '');
    setMetaTitle(node.metaTitle || '');
    setMetaDescription(node.metaDescription || '');
    setTags(node.tags || []);
    setImageUrl(node.imageUrl || '');
    setIconUrl(readCategoryIcons()[node.id] || node.iconUrl || '');
    setAssetFile(node.imageUrl ? { name: node.imageUrl.split('/').pop() || 'image', size: '', dimensions: '' } : null);
  };

  const selectNode = async (node: TreeNode) => {
    applyNodeToForm(node);
    try {
      if (node.type === 'primary') {
        const detail = await getPrimaryCategoryById(node.numericId);
        if (detail) {
          const mapped = mapPrimary(detail, []);
          applyNodeToForm({ ...mapped, children: node.children, id: node.id, iconUrl: node.iconUrl });
        }
      } else {
        const detail = await getSecondaryCategoryById(node.numericId);
        if (detail) {
          const ancestors = (node.pathNames || []).slice(0, -1);
          applyNodeToForm({
            ...mapSecondary(detail, ancestors, node.type, node.primaryId),
            id: node.id,
            children: node.children,
            primaryId: node.primaryId,
            iconUrl: node.iconUrl,
          });
        }
      }
    } catch {
      /* keep list data if detail fetch fails */
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter tree based on search input
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;
    const q = searchQuery.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      const kids = (node.children || []).map(filterNode).filter(Boolean) as TreeNode[];
      if (node.name.toLowerCase().includes(q)) return { ...node };
      if (kids.length) return { ...node, children: kids };
      return null;
    };
    return treeData.map(filterNode).filter(Boolean) as TreeNode[];
  }, [treeData, searchQuery]);

  const breadcrumbTrail = useMemo(() => {
    const target = selectedNode || creatingUnder;
    if (!target) return [];
    const trail = trailTo(treeData, target.id);
    return trail.length ? trail : [target];
  }, [treeData, selectedNode, creatingUnder]);

  const isSecondaryForm = Boolean(
    creatingUnder || selectedNode?.type === 'secondary' || selectedNode?.type === 'sub'
  );

  // ============================================================================
  // UI-ONLY ACTIONS: SAVE, DISCARD, ADD TAG, REMOVE TAG, ADD CATEGORY
  // ============================================================================

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showToast('Enter a category name before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = writePayload();
      if (creatingUnder) {
        const created =
          creatingUnder.type === 'primary'
            ? await createSecondaryCategory(creatingUnder.numericId, payload)
            : await createSubCategory(creatingUnder.numericId, {
                ...payload,
                parentSecondaryId: creatingUnder.numericId,
              });
        const parentId = creatingUnder.id;
        const mapped = mapSecondary(
          created,
          [...(creatingUnder.pathNames || [creatingUnder.name])],
          creatingUnder.type === 'primary' ? 'secondary' : 'sub',
          creatingUnder.type === 'primary' ? creatingUnder.numericId : creatingUnder.primaryId
        );
        if (iconUrl) writeCategoryIcon(mapped.id, iconUrl);
        showToast(`Secondary category "${payload.name}" created.`);
        setCreatingUnder(null);
        setExpandedNodes((prev) => ({ ...prev, [parentId]: true }));
        await loadCategories(mapped.numericId ? mapped.id : undefined);
        return;
      }
      if (!selectedNode) {
        const created = await createPrimaryCategory(payload);
        const node = mapPrimary(created);
        if (iconUrl) writeCategoryIcon(node.id, iconUrl);
        showToast(`Category "${payload.name}" created.`);
        await loadCategories(node.numericId ? node.id : undefined);
        setTreeData((prev) => {
          if (prev.some((item) => item.numericId && item.numericId === node.numericId)) return prev;
          if (prev.length === 0) return [node];
          return prev;
        });
        if (node.name) applyNodeToForm(node);
        return;
      }
      if (selectedNode.type === 'primary') {
        await updatePrimaryCategory(selectedNode.numericId, payload);
      } else {
        await updateSecondaryCategory(selectedNode.numericId, payload);
      }
      await loadCategories(selectedNode.id);
      showToast(`Category "${payload.name}" updated.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const clearEditor = () => {
    setCategoryName('');
    setUrlSlug('');
    setDescription('');
    setMetaTitle('');
    setMetaDescription('');
    setTags([]);
    setImageUrl('');
    setIconUrl('');
    setAssetFile(null);
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const startNewPrimary = () => {
    setCreatingUnder(null);
    setSelectedNode(null);
    clearEditor();
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleDiscard = () => {
    if (creatingUnder) {
      setCreatingUnder(null);
      selectNode(creatingUnder);
      showToast('Changes discarded.');
      return;
    }
    if (selectedNode) {
      selectNode(selectedNode);
      showToast('Changes discarded.');
      return;
    }
    startNewPrimary();
  };

  const handleDeleteCategory = async () => {
    if (!selectedNode) return;
    const confirmed = window.confirm(`Delete "${selectedNode.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      if (selectedNode.type === 'primary') {
        await deletePrimaryCategory(selectedNode.numericId);
      } else {
        await deleteSecondaryCategory(selectedNode.numericId);
      }
      showToast(`Category "${selectedNode.name}" deleted.`);
      await loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category');
    }
  };

  const persistCategoryFields = async (nextTags: string[], nextImageUrl: string) => {
    if (!selectedNode || !categoryName.trim()) return;
    const payload = {
      name: categoryName.trim(),
      description: description.trim(),
      imageUrl: nextImageUrl,
      seo: {
        page_title: metaTitle.trim() || categoryName.trim(),
        meta_desc: metaDescription.trim() || description.trim(),
        url_slug: urlSlug.trim() || slugify(categoryName),
        keywords: nextTags,
      },
      internalTags: nextTags,
    };
    if (selectedNode.type === 'primary') {
      await updatePrimaryCategory(selectedNode.numericId, payload);
    } else {
      await updateSecondaryCategory(selectedNode.numericId, payload);
    }
  };

  const handleAddTag = async () => {
    const formatted = newTagInput.trim().toUpperCase();
    if (!formatted) {
      showToast('Type a tag name first.');
      return;
    }
    if (tags.includes(formatted)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }
    const nextTags = [...tags, formatted];
    setTags(nextTags);
    setNewTagInput('');
    setIsAddingTag(false);
    try {
      await persistCategoryFields(nextTags, imageUrl);
      showToast(`Tag "${formatted}" added.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save tag');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    try {
      await persistCategoryFields(nextTags, imageUrl);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove tag');
    }
  };

  const handleAssetFile = async (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showToast('Use PNG or JPG up to 10MB.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be 10MB or smaller.');
      return;
    }
    setIsUploadingAsset(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const dimensions = await readImageSize(file);
      setImageUrl(data.url);
      setAssetFile({ name: file.name, size: formatBytes(file.size), dimensions });
      await persistCategoryFields(tags, data.url);
      showToast('Category image updated.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload image');
    } finally {
      setIsUploadingAsset(false);
      if (assetInputRef.current) assetInputRef.current.value = '';
    }
  };

  const handleRemoveAsset = async () => {
    setAssetFile(null);
    setImageUrl('');
    try {
      await persistCategoryFields(tags, '');
      showToast('Category image removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove image');
    }
  };

  const patchTreeIcon = (id: string, url: string) => {
    const walk = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((node) => ({
        ...node,
        iconUrl: node.id === id ? url : node.iconUrl,
        children: walk(node.children || []),
      }));
    setTreeData((prev) => walk(prev));
    setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, iconUrl: url } : prev));
  };

  const handleIconFile = async (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!allowed.includes(file.type) && !/\.(png|jpe?g|webp|gif|ico|svg)$/i.test(file.name)) {
      showToast('Use PNG, JPG, SVG, or ICO for the favicon.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Favicon must be 2MB or smaller.');
      return;
    }
    setIsUploadingIcon(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');
      const res = await fetch('/api/uploads', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setIconUrl(data.url);
      if (selectedNode) {
        writeCategoryIcon(selectedNode.id, data.url);
        patchTreeIcon(selectedNode.id, data.url);
      }
      showToast('Folder favicon updated.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload favicon');
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleRemoveIcon = () => {
    setIconUrl('');
    if (selectedNode) {
      writeCategoryIcon(selectedNode.id, '');
      patchTreeIcon(selectedNode.id, '');
    }
    showToast('Folder favicon removed.');
  };

  const openAddChild = (node: TreeNode) => {
    setCreatingUnder(node);
    setSelectedNode(null);
    setExpandedNodes((prev) => ({ ...prev, [node.id]: true }));
    clearEditor();
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const renderFolder = (node: TreeNode, depth: number) => {
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedNode?.id === node.id;
    const children = node.children || [];

    return (
      <div key={node.id}>
        <div
          style={{ paddingLeft: 6 + depth * 14 }}
          className={`group flex items-center gap-1 rounded-md py-1 pr-1 text-xs ${
            isSelected || creatingUnder?.id === node.id
              ? 'bg-gray-100 font-bold text-black'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <button
            type="button"
            onClick={() => toggleExpand(node.id)}
            className="grid h-5 w-5 place-items-center text-gray-400"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) toggleExpand(node.id);
              selectNode(node);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            {node.iconUrl ? (
              <img src={node.iconUrl} alt="" className="h-5 w-5 shrink-0 rounded-sm object-cover" />
            ) : (
              <span className="shrink-0">{isExpanded ? '📂' : '📁'}</span>
            )}
            <span className="truncate">{node.name}</span>
          </button>
          <button
            type="button"
            title="Add secondary category"
            onClick={() => openAddChild(node)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded border border-gray-200 text-gray-500 hover:border-black hover:text-black"
          >
            +
          </button>
        </div>
        {isExpanded && (
          <div className="ml-3 border-l border-gray-200">
            {children.map((child) => renderFolder(child, depth + 1))}
            <button
              type="button"
              onClick={() => openAddChild(node)}
              style={{ paddingLeft: 8 + (depth + 1) * 14 }}
              className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[11px] font-semibold text-gray-400 hover:text-black"
            >
              <span>+</span>
              <span>Add secondary category</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-700 animate-fade-in">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar />

      {/* Top Header */}
      <TopHeader onSearch={(q) => setSearchQuery(q)} />

      {/* Main Container */}
      <div className="ml-56 pt-16 flex-1 flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ===================================================================== */}
        {/* MIDDLE COLUMN: CATALOG STRUCTURE (Tree View) */}
        {/* ===================================================================== */}
        <section className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Catalog Structure</h2>
            <button
              onClick={startNewPrimary}
              className="w-7 h-7 rounded-full border border-gray-300 hover:border-black text-gray-600 hover:text-black flex items-center justify-center text-sm font-semibold transition-colors"
              title="New primary category"
            >
              +
            </button>
          </div>

          {/* Tree Navigation */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingTree && <p className="px-2 py-6 text-xs text-gray-400">Loading folders…</p>}
            {!isLoadingTree && filteredTreeData.length === 0 && (
              <p className="px-2 py-6 text-xs text-gray-400">No folders yet. Use + to create a primary category.</p>
            )}
            {filteredTreeData.map((node) => renderFolder(node, 0))}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: CATEGORY DETAILS & EDITING */}
        {/* ===================================================================== */}
        <main className="flex-1 bg-white p-8 overflow-y-auto">
          {/* Top Breadcrumb & Actions */}
          <div className="flex items-center justify-between mb-2">
            <nav className="flex min-w-0 flex-1 flex-wrap items-end gap-x-1.5 gap-y-1 pr-4">
              {selectedNode || creatingUnder ? (
                <>
                  {breadcrumbTrail.map((crumb, index) => (
                    <span key={crumb.id} className="flex items-end gap-1.5">
                      {index > 0 && <span className="mb-0.5 text-gray-300">›</span>}
                      <button
                        type="button"
                        onClick={() => selectNode(crumb)}
                        className={`text-left ${
                          !creatingUnder && crumb.id === selectedNode?.id ? '' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          {levelLabel(crumb.type)}
                        </span>
                        <span className="block text-xs font-bold text-gray-800">
                          {!creatingUnder && index === breadcrumbTrail.length - 1
                            ? categoryName || crumb.name
                            : crumb.name}
                        </span>
                      </button>
                    </span>
                  ))}
                  {creatingUnder && (
                    <span className="flex items-end gap-1.5">
                      <span className="mb-0.5 text-gray-300">›</span>
                      <span className="text-left">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Secondary
                        </span>
                        <span className="block text-xs font-bold text-gray-800">
                          {categoryName.trim() || 'New secondary category'}
                        </span>
                      </span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Primary</span>
                  <span className="block text-xs font-bold text-gray-800">
                    {categoryName.trim() || 'New primary category'}
                  </span>
                </span>
              )}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startNewPrimary}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                New primary category
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Discard
              </button>
              {selectedNode && (
                <button
                  type="button"
                  onClick={() => openAddChild(selectedNode)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Add secondary category
                </button>
              )}
              {selectedNode && (
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={isSaving}
                className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isSaving
                  ? 'Saving…'
                  : creatingUnder
                    ? 'Create secondary category'
                    : selectedNode
                      ? 'Save Category'
                      : 'Create primary category'}
              </button>
            </div>
          </div>

          {/* Heading */}
          <h1
            className={`text-3xl font-extrabold text-gray-900 tracking-tight ${
              selectedNode && !creatingUnder ? 'mb-8' : 'mb-2'
            }`}
          >
            {creatingUnder
              ? categoryName || 'Secondary category'
              : selectedNode
                ? categoryName || 'Category Details'
                : categoryName || 'New primary category'}
          </h1>
          {creatingUnder && (
            <p className="mb-8 text-sm text-gray-500">
              Fill in the secondary category details here under “{creatingUnder.name}”, then click Create secondary
              category.
            </p>
          )}
          {!selectedNode && !creatingUnder && (
            <p className="mb-8 text-sm text-gray-500">
              Fill in the primary category details here, then click Create primary category. Use the + on a folder to add
              a secondary category in this editor.
            </p>
          )}

          {/* Grid Layout for Settings Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: General Information & SEO Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: General Information */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                    i
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">General Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Category Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      {isSecondaryForm ? 'SECONDARY CATEGORY NAME' : 'PRIMARY CATEGORY NAME'}
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={categoryName}
                      placeholder={
                        creatingUnder
                          ? 'Enter secondary category name'
                          : selectedNode
                            ? ''
                            : 'Enter primary category name'
                      }
                      onChange={(e) => {
                        setCategoryName(e.target.value);
                        setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }}
                      className="w-full text-xs font-medium text-gray-900 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* URL Slug */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      URL SLUG
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-black">
                      <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs font-medium border-r border-gray-300">
                        /cat/
                      </span>
                      <input
                        type="text"
                        value={urlSlug}
                        onChange={(e) => setUrlSlug(e.target.value)}
                        className="w-full text-xs font-medium text-gray-900 p-2.5 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    DESCRIPTION
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter category description..."
                    className="w-full text-xs text-gray-800 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Card 2: SEO Settings */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-sm font-bold text-gray-900">SEO Settings</h3>
                </div>

                {/* Meta Title */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    META TITLE
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full text-xs font-medium text-gray-900 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    META DESCRIPTION
                  </label>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Enter meta description for search engines..."
                    className="w-full text-xs text-gray-800 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black leading-relaxed resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Category Asset & Internal Tags */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Folder favicon</h3>
                <p className="mb-4 text-[11px] text-gray-500">Shown next to this category in Catalog Structure.</p>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,.ico,.svg"
                  className="hidden"
                  onChange={(e) => handleIconFile(e.target.files?.[0])}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isUploadingIcon}
                    onClick={() => iconInputRef.current?.click()}
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:border-gray-400"
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt="Folder favicon" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">📁</span>
                    )}
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      disabled={isUploadingIcon}
                      onClick={() => iconInputRef.current?.click()}
                      className="text-xs font-semibold text-gray-800 hover:underline"
                    >
                      {isUploadingIcon ? 'Uploading…' : iconUrl ? 'Change favicon' : 'Upload favicon'}
                    </button>
                    <p className="mt-0.5 text-[10px] text-gray-400">PNG, JPG, SVG, or ICO · up to 2MB</p>
                    {iconUrl && (
                      <button type="button" onClick={handleRemoveIcon} className="mt-1 text-[11px] font-semibold text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Category Asset */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Category Asset</h3>

                <input
                  ref={assetInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleAssetFile(e.target.files?.[0])}
                />

                <button
                  type="button"
                  disabled={isUploadingAsset}
                  onClick={() => assetInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAssetFile(e.dataTransfer.files?.[0]);
                  }}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50/50 disabled:opacity-60"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="Category asset" className="mx-auto mb-3 h-24 w-full max-w-[220px] rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 mx-auto mb-2 text-gray-400 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  )}
                  <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                    {isUploadingAsset ? 'Uploading…' : 'Drag & drop to update'}
                  </div>
                  <div className="text-[10px] text-gray-400">PNG, JPG up to 10MB</div>
                </button>

                {assetFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 flex-shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{assetFile.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {[assetFile.size, assetFile.dimensions].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveAsset}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      title="Delete asset"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Card 4: Internal Tags */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Internal Tags</h3>

                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-400 hover:text-red-500 font-normal transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {isAddingTag ? (
                    <div className="inline-flex items-center gap-1 border border-gray-300 rounded-md px-2 py-0.5 bg-white">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                          if (e.key === 'Escape') setIsAddingTag(false);
                        }}
                        placeholder="Tag name..."
                        className="text-xs font-medium text-gray-900 bg-white focus:outline-none w-28 uppercase select-text"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddTag} className="text-xs font-bold text-black">
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 border border-dashed border-gray-300 hover:border-black text-gray-500 hover:text-black text-xs font-bold rounded-md transition-colors"
                    >
                      <span>+ ADD TAG</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}
