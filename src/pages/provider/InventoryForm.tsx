import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GEAR_CATEGORIES, CONDITIONS } from '@/lib/categories';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getErrorMessage,
  isFetchError,
} from '@/lib/error-utils';
import { logger } from '@/lib/logger';
import { validateImageFiles } from '@/lib/file-validation';
import { updateGearItem, insertGearItem, insertGearImages, deleteGearImages } from '@/lib/supabaseLegacy';

interface FormData {
  name: string;
  category: string;
  description: string;
  price_per_day: string;
  quantity_total: string;
  condition: string;
  sku: string;
  location: string;
  notes: string;
}

interface ValidationErrors {
  name?: string;
  category?: string;
  price_per_day?: string;
  quantity_total?: string;
}

interface GearImage {
  id: string;
  url: string;
  sort_order: number;
}

const InventoryForm = () => {
  const { id } = useParams();
  const { provider } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    description: '',
    price_per_day: '',
    quantity_total: '1',
    condition: 'good',
    sku: '',
    location: provider?.location || '',
    notes: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // State for images
  const [existingImages, setExistingImages] = useState<GearImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [currentQuantityAvailable, setCurrentQuantityAvailable] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchItem(id);
    }
  }, [id]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    const nameLength = formData.name.trim().length;
    if (nameLength === 0) {
      errors.name = 'Název je povinný';
    } else if (nameLength < 3) {
      errors.name = 'Název musí mít alespoň 3 znaky';
    } else if (nameLength > 100) {
      errors.name = 'Název může mít maximálně 100 znaků';
    }

    // Category validation
    if (!formData.category) {
      errors.category = 'Kategorie je povinná';
    }

    // Price validation
    const price = parseFloat(formData.price_per_day);
    if (!formData.price_per_day || isNaN(price)) {
      errors.price_per_day = 'Cena je povinná';
    } else if (price < 10) {
      errors.price_per_day = 'Cena musí být alespoň 10 Kč';
    } else if (price > 10000) {
      errors.price_per_day = 'Cena může být maximálně 10,000 Kč';
    }

    // Quantity validation
    const quantity = parseInt(formData.quantity_total);
    if (!formData.quantity_total || isNaN(quantity)) {
      errors.quantity_total = 'Množství je povinné';
    } else if (quantity < 1) {
      errors.quantity_total = 'Množství musí být alespoň 1';
    } else if (quantity > 100) {
      errors.quantity_total = 'Množství může být maximálně 100';
    } else if (!Number.isInteger(quantity)) {
      errors.quantity_total = 'Množství musí být celé číslo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchItem = async (itemId: string) => {
    logger.debug('Fetching item for edit:', itemId);

    try {
      const { data, error } = await supabase
        .from('gear_items')
        .select(`
          *,
          gear_images (
            id,
            url,
            sort_order
          )
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;

      if (data) {
        logger.debug('Item fetched successfully');
        setFormData({
          name: data.name || '',
          category: data.category || '',
          description: data.description || '',
          price_per_day: data.price_per_day?.toString() || '',
          quantity_total: data.quantity_total?.toString() || '1',
          condition: data.condition || 'good',
          sku: data.sku || '',
          location: data.location || '',
          notes: data.notes || '',
        });

        // Handle images
        const images = (data.gear_images as unknown as GearImage[]) || [];
        // Sort by sort_order
        setExistingImages(images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

        setCurrentQuantityAvailable(
          typeof data.quantity_available === 'number' ? data.quantity_available : null
        );
      }
    } catch (error) {
      logger.error('Error fetching item', error);
      toast.error(getErrorMessage(error) || 'Failed to load item');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCurrentImages = existingImages.length - deletedImageIds.length + newImages.length;

    // Validate file count
    if (totalCurrentImages + files.length > 5) {
      toast.error('Maximálně 5 obrázků', {
        description: `Můžete nahrát ještě ${5 - totalCurrentImages} obrázků.`
      });
      return;
    }

    // Validate files using magic bytes (prevents spoofed file types)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    logger.debug('Validating files with magic bytes check...');
    const validationResult = await validateImageFiles(files, validTypes);

    if (validationResult.invalid.length > 0) {
      const errorMessages = validationResult.invalid
        .map(({ file, error }) => `${file.name}: ${error}`)
        .join('\n');

      toast.error('Neplatné soubory', {
        description: errorMessages || 'Některé soubory nejsou validní obrázky.'
      });

      // If some files are valid, add only those
      if (validationResult.valid.length > 0) {
        logger.debug(`Added ${validationResult.valid.length} valid files, rejected ${validationResult.invalid.length}`);
        setNewImages([...newImages, ...validationResult.valid]);
      }
      return;
    }

    logger.debug('All files validated successfully:', validationResult.valid.length);
    setNewImages([...newImages, ...validationResult.valid]);
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = (id: string) => {
    setDeletedImageIds([...deletedImageIds, id]);
    setExistingImages(existingImages.filter(img => img.id !== id));
  };

  const uploadImages = async (files: File[], targetItemId: string): Promise<string[]> => {
    if (files.length === 0) return [];
    if (!provider?.id) {
      toast.error('Chybí kontext poskytovatele', {
        description: 'Nelze nahrát obrázky bez Provider ID.'
      });
      return [];
    }

    logger.debug('Uploading images:', files.length);
    setUploadingImages(true);
    const urls: string[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `providers/${provider.id}/${targetItemId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gear-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gear-images')
          .getPublicUrl(filePath);

        urls.push(publicUrl);
        logger.debug(`Image ${i + 1}/${files.length} uploaded successfully to ${filePath}`);
      } catch (error) {
        logger.error('Error uploading image', error);
        failedUploads.push(file.name);
        toast.error(`Nepodařilo se nahrát ${file.name}`, {
          description: getErrorMessage(error)
        });
      }
    }

    setUploadingImages(false);

    // Summary notification
    if (failedUploads.length > 0) {
      toast.warning(`Nahráno ${urls.length}/${files.length} obrázků`, {
        description: `Selhalo: ${failedUploads.join(', ')}`
      });
    } else if (urls.length > 0) {
      toast.success(`Nahráno ${urls.length} obrázků`);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast.error('Opravte chyby ve formuláři', {
        description: 'Zkontrolujte označená pole.'
      });
      return;
    }

    setLoading(true);

    try {
      logger.debug('Saving item...');

      // Determine targetItemId for storage path
      const targetItemId = id || crypto.randomUUID();

      // 1. Upload new images
      const uploadedUrls = await uploadImages(newImages, targetItemId);

      // Determine primary image
      // If we have existing images, the first one is primary (unless all deleted, which we filtered out of state already)
      // If no existing, the first new uploaded image is primary
      const allActiveImages = [...existingImages.map(img => img.url), ...uploadedUrls];
      const primaryImageUrl = allActiveImages.length > 0 ? allActiveImages[0] : null;

      const quantityTotal = parseInt(formData.quantity_total, 10);
      let quantityAvailable = quantityTotal;

      if (id) {
        const existingAvailable = currentQuantityAvailable ?? quantityTotal;
        // Preserve current availability unless the new total would drop below it
        quantityAvailable =
          existingAvailable > quantityTotal ? quantityTotal : existingAvailable;
      }

      const itemData = {
        id: targetItemId, // Explicitly set ID for new items
        provider_id: provider?.id,
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description?.trim() || null,
        price_per_day: parseFloat(formData.price_per_day),
        quantity_total: quantityTotal,
        quantity_available: quantityAvailable,
        condition: formData.condition,
        sku: formData.sku?.trim() || null,
        location: formData.location?.trim() || provider?.location || null,
        notes: formData.notes?.trim() || null,
        active: true,
        item_state: 'available',
        image_url: primaryImageUrl,
      };

      if (id) {
        // Update existing item
        logger.debug('Updating item:', id);
        // Exclude ID from update payload to avoid primary key update errors logic if any
        const { id: _, ...updateData } = itemData;
        const { error } = await updateGearItem(supabase, id, updateData);

        if (error) {
          handleSupabaseError(error, 'Nepodařilo se aktualizovat položku');
          throw error;
        }

        // Delete removed images
        if (deletedImageIds.length > 0) {
          const { error: deleteError } = await deleteGearImages(supabase, deletedImageIds);
          if (deleteError) {
            logger.error('Error deleting images', deleteError);
            toast.warning('Položka uložena', { description: 'Nepodařilo se smazat některé staré obrázky.' });
          }
        }
      } else {
        // Create new item
        logger.debug('Creating new item with ID:', targetItemId);
        const { error } = await insertGearItem(supabase, itemData);

        if (error) {
          handleSupabaseError(error, 'Nepodařilo se vytvořit položku');
          throw error;
        }
      }

      // Insert new additional images into gear_images table
      // We need to calculate sort_order based on existing count
      if (uploadedUrls.length > 0) {
        const startSortOrder = existingImages.length;
        const imageRecords = uploadedUrls.map((url, index) => ({
          gear_id: targetItemId,
          provider_id: provider?.id, // Added provider_id
          url,
          sort_order: startSortOrder + index,
        }));

        const { error: imgError } = await insertGearImages(supabase, imageRecords);

        if (imgError) {
          logger.error('Failed to save additional images', imgError);
          toast.warning('Položka uložena', {
            description: 'Některé obrázky se nepodařilo uložit do galerie.'
          });
        }
      }

      toast.success(id ? 'Položka aktualizována' : 'Položka vytvořena');
      navigate('/provider/inventory');

    } catch (error) {
      // Error handled in steps or below catch-all
      if (!loading) return; // if we already stopped loading (e.g. upload fail)
      logger.error('Unexpected error in submit', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSupabaseError = (error: { code?: string; message: string; details?: string; hint?: string }, defaultMsg: string) => {
    logger.error('Supabase error', error);
    if (error.code === '42501' || error.code === 'PGRST301') {
      toast.error('Chyba přístupu', { description: 'Nemáte oprávnění (Pravděpodobně nejste schválený poskytovatel).' });
    } else if (error.message?.includes('unique constraint')) {
      toast.error('Duplikát', { description: 'Položka s tímto SKU již existuje.' });
    } else {
      toast.error(defaultMsg, { description: error.message || 'Zkuste to znovu.' });
    }
  };

  const currentTotalImages = existingImages.length + newImages.length;

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/provider/inventory">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-6">
          {id ? 'Edit Gear Item' : 'Add Gear Item'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="name">Název položky *</Label>
                  <span className={`text-xs ${formData.name.length > 100 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {formData.name.length}/100
                  </span>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: undefined });
                    }
                  }}
                  placeholder="např. Ferratový set - kompletní"
                  className={validationErrors.name ? 'border-red-500' : ''}
                  disabled={loading || uploadingImages}
                  maxLength={101}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Kategorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    setFormData({ ...formData, category: value });
                    if (validationErrors.category) {
                      setValidationErrors({ ...validationErrors, category: undefined });
                    }
                  }}
                  disabled={loading || uploadingImages}
                >
                  <SelectTrigger className={validationErrors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Vyberte kategorii" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEAR_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.category && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.category}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the item..."
                  rows={4}
                  maxLength={2000}
                />
                {formData.description.length > 1600 && (
                  <p className={`text-sm mt-1 ${formData.description.length > 1900 ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                    }`}>
                    {formData.description.length}/2000 znaků
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Cena za den (Kč) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="10"
                    max="10000"
                    step="10"
                    value={formData.price_per_day}
                    onChange={(e) => {
                      setFormData({ ...formData, price_per_day: e.target.value });
                      if (validationErrors.price_per_day) {
                        setValidationErrors({ ...validationErrors, price_per_day: undefined });
                      }
                    }}
                    placeholder="200"
                    className={validationErrors.price_per_day ? 'border-red-500' : ''}
                    disabled={loading || uploadingImages}
                  />
                  {validationErrors.price_per_day && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.price_per_day}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Min: 10 Kč, Max: 10,000 Kč</p>
                </div>
                <div>
                  <Label htmlFor="quantity">Množství *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={formData.quantity_total}
                    onChange={(e) => {
                      setFormData({ ...formData, quantity_total: e.target.value });
                      if (validationErrors.quantity_total) {
                        setValidationErrors({ ...validationErrors, quantity_total: undefined });
                      }
                    }}
                    className={validationErrors.quantity_total ? 'border-red-500' : ''}
                    disabled={loading || uploadingImages}
                  />
                  {validationErrors.quantity_total && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.quantity_total}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Min: 1, Max: 100</p>
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(cond => (
                        <SelectItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {/* Existing Images */}
                {existingImages.map((img, index) => (
                  <div key={img.id} className="relative aspect-square group">
                    <img
                      src={img.url}
                      alt={`Item ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && deletedImageIds.length === 0 && (
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}

                {/* New Images */}
                {newImages.map((file, index) => (
                  <div key={`new-${index}`} className="relative aspect-square group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`New ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-dashed border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      aria-label="Remove new image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                      New
                    </div>
                  </div>
                ))}

                {currentTotalImages < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-green-500 hover:bg-green-50/50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: JPG, PNG, WebP. Max 5MB per file.
              </p>
            </CardContent>
          </Card>

          {/* Internal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Info (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="FS-001"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Warehouse A"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={3}
                  maxLength={1000}
                />
                {formData.notes.length > 800 && (
                  <p className={`text-sm mt-1 ${formData.notes.length > 950 ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                    }`}>
                    {formData.notes.length}/1000 znaků
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/provider/inventory')}
              disabled={loading || uploadingImages}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={loading || uploadingImages}>
              {uploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Nahrávání obrázků...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukládání...
                </>
              ) : (
                `${id ? 'Uložit změny' : 'Přidat položku'}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProviderLayout>
  );
};


export default InventoryForm;
