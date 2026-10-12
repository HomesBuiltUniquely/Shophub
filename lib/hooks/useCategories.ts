import { useState, useCallback } from 'react';
import {
  getAllPrimaryCategories,
  getPrimaryCategoryById,
  getAllSecondaryCategories,
  getCategoriesByPrimary,
  getSecondaryCategoryById,
  deletePrimaryCategory,
  deleteSecondaryCategory,
} from '../api/category.service';
import { PrimaryCategory, SecondaryCategory, ApiError } from '../types/api.types';
import { CategoryType } from '../types';

interface UseCategoriesReturn {
  primaryCategories: PrimaryCategory[];
  secondaryCategories: SecondaryCategory[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (categoryType: CategoryType) => Promise<void>;
  fetchPrimaryCategoryById: (id: string | number) => Promise<PrimaryCategory | null>;
  fetchSecondaryCategoryById: (id: string | number) => Promise<SecondaryCategory | null>;
  fetchSecondaryCategoriesByPrimary: (primaryId: string | number) => Promise<SecondaryCategory[]>;
  clearError: () => void;
  deleteCategory: (categoryType: 'primary' | 'secondary', categoryId: string | number) => Promise<void>;
  isDeleting: boolean;
}

/**
 * Custom hook for managing category data and API calls
 */
export const useCategories = (): UseCategoriesReturn => {
  const [primaryCategories, setPrimaryCategories] = useState<PrimaryCategory[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch categories based on type
   */
  const fetchCategories = useCallback(async (categoryType: CategoryType) => {
    setIsLoading(true);
    setError(null);

    try {
      if (categoryType === 'primary') {
        const data = await getAllPrimaryCategories();
        setPrimaryCategories(data);
      } else if (categoryType === 'secondary') {
        const data = await getAllSecondaryCategories();
        setSecondaryCategories(data);
      } else if (categoryType === 'all') {
        const [primaryRes, secondaryRes] = await Promise.allSettled([
          getAllPrimaryCategories(),
          getAllSecondaryCategories(),
        ]);

        if (primaryRes.status === 'fulfilled') {
          setPrimaryCategories(primaryRes.value);
        } else {
          console.warn('Primary category fetch error:', primaryRes.reason);
        }

        if (secondaryRes.status === 'fulfilled') {
          setSecondaryCategories(secondaryRes.value);
        } else {
          console.warn('Secondary category fetch error:', secondaryRes.reason);
        }

        if (primaryRes.status === 'rejected' && secondaryRes.status === 'rejected') {
          const apiError = primaryRes.reason as ApiError;
          setError(apiError?.message || 'Failed to fetch categories');
        }
      }
    } catch (err: any) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch categories');
      console.warn('Category fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPrimaryCategoryById = useCallback(async (id: string | number) => {
    return await getPrimaryCategoryById(id);
  }, []);

  const fetchSecondaryCategoryById = useCallback(async (id: string | number) => {
    return await getSecondaryCategoryById(id);
  }, []);

  const fetchSecondaryCategoriesByPrimary = useCallback(async (primaryId: string | number) => {
    return await getCategoriesByPrimary(primaryId);
  }, []);

  /**
   * Delete a category and update state
   */
  const deleteCategory = useCallback(
    async (categoryType: 'primary' | 'secondary', categoryId: string | number) => {
      setIsDeleting(true);
      setError(null);

      try {
        if (categoryType === 'primary') {
          await deletePrimaryCategory(categoryId);
          setPrimaryCategories((prev) =>
            prev.filter((cat) => String(cat.primaryCategoryId) !== String(categoryId))
          );
        } else if (categoryType === 'secondary') {
          await deleteSecondaryCategory(categoryId);
          setSecondaryCategories((prev) =>
            prev.filter((cat) => String(cat.secondaryCategoryId) !== String(categoryId))
          );
        }
      } catch (err: any) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to delete category');
        console.error('Category delete error:', err);
        throw apiError;
      } finally {
        setIsDeleting(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    primaryCategories,
    secondaryCategories,
    isLoading,
    isDeleting,
    error,
    fetchCategories,
    fetchPrimaryCategoryById,
    fetchSecondaryCategoryById,
    fetchSecondaryCategoriesByPrimary,
    deleteCategory,
    clearError,
  };
};
