import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { PlusCircle, Edit2, Trash2, Tag, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import adminService from '../services/adminService';

export const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#6366f1');

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        color,
        icon: 'Tag',
      };
      const res = await adminService.createCategory(payload);
      setCategories((prev) => [...prev, res.data]);
      setName('');
      setSlug('');
      setIsAddModalOpen(false);
      setSuccess('Category added successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create category.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      setError('');
      const payload = { name, color, slug };
      const res = await adminService.updateCategory(editingCategory.id, payload);
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? res.data : c))
      );
      setEditingCategory(null);
      setSuccess('Category updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      setError('');
      await adminService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setSuccess('Category deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Event Categories & Venues"
        subtitle="Manage classification taxonomies and color schemes used across the calendar"
        breadcrumbs={['Admin', 'Categories']}
        actions={
          <Button
            icon={PlusCircle}
            onClick={() => {
              setName('');
              setSlug('');
              setColor('#6366f1');
              setIsAddModalOpen(true);
            }}
          >
            Add Category
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tag className="w-5 h-5" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setName(cat.name);
                      setSlug(cat.slug);
                      setColor(cat.color);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-50"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-50"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">slug: {cat.slug}</p>
                {cat._count?.events !== undefined && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {cat._count.events} {cat._count.events === 1 ? 'event' : 'events'} tagged
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.color}
                </span>
                <span className="font-semibold text-slate-700">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
        subtitle="Create a new classification for events"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Health & Wellness"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            }}
          />

          <Input
            label="Slug (URL Friendly)"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category Theme Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <span className="text-xs font-mono text-slate-600">{color}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      {editingCategory && (
        <Modal
          isOpen={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          title={`Edit Category: ${editingCategory.name}`}
        >
          <form onSubmit={handleUpdateCategory} className="space-y-4">
            <Input
              label="Category Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <span className="text-xs font-mono text-slate-600">{color}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Update Category
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default CategoryManagementPage;
