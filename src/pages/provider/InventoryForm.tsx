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
  getErrorCode,
  getErrorMessage,
  isFetchError,
  isSupabaseConstraintError,
} from '@/lib/error-utils';

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
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
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
    console.log('📝 Fetching item for edit:', itemId);

    try {
      const { data, error } = await supabase
        .from('gear_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;

      if (data) {
        console.log('✅ Item fetched:', data);
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
        setExistingImageUrl(data.image_url);
        setCurrentQuantityAvailable(
          typeof data.quantity_available === 'number' ? data.quantity_available : null
        );
      }
    } catch (error) {
      console.error('❌ Error fetching item:', error);
      toast.error(getErrorMessage(error) || 'Failed to load item');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file count
    if (images.length + files.length > 5) {
      toast.error('Maximálně 5 obrázků', {
        description: `Můžete nahrát ještě ${5 - images.length} obrázků.`
      });
      return;
    }

    // Validate file size (max 5MB per image)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('Příliš velký soubor', {
        description: `Některé obrázky přesahují limit 5MB. Vyberte menší soubory.`
      });
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Neplatný formát', {
        description: 'Pouze JPG, PNG a WEBP obrázky jsou povoleny.'
      });
      return;
    }

    console.log('✅ Selected', files.length, 'valid images');
    setImages([...images, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    console.log('📤 Uploading', files.length, 'images...');
    setUploadingImages(true);
    const urls: string[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${provider?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log(`Uploading file ${i + 1}/${files.length}:`, file.name);

        const { data, error } = await supabase.storage
          .from('gear-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`❌ Upload error for ${file.name}:`, error);
          failedUploads.push(file.name);

          if (error.message.includes('storage/object-not-found')) {
            toast.error('Chyba storage', {
              description: 'Bucket "gear-images" nenalezen. Zkontrolujte nastavení.'
            });
          } else if (error.message.includes('Payload too large')) {
            toast.error(`Soubor ${file.name} je příliš velký`, {
              description: 'Maximální velikost je 5MB.'
            });
          }
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('gear-images')
          .getPublicUrl(fileName);

        urls.push(publicUrl);
        console.log(`✅ Image ${i + 1}/${files.length} uploaded:`, publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        failedUploads.push(file.name);

        if (isFetchError(error)) {
          toast.error('Chyba připojení', {
            description: 'Zkontrolujte internetové připojení.'
          });
        }
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

    console.log(`✅ Upload complete: ${urls.length} successful, ${failedUploads.length} failed`);
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
      console.log('💾 Saving item...');

      // Upload new images
      const uploadedUrls = await uploadImages(images);
      const primaryImageUrl = uploadedUrls[0] || existingImageUrl || null;

      const quantityTotal = parseInt(formData.quantity_total, 10);
      let quantityAvailable = quantityTotal;

      if (id) {
        const existingAvailable = currentQuantityAvailable ?? quantityTotal;
        // Preserve current availability unless the new total would drop below it
        quantityAvailable =
          existingAvailable > quantityTotal ? quantityTotal : existingAvailable;
      }

      const itemData = {
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

      console.log('Item data:', itemData);

      if (id) {
        // Update existing
        console.log('Updating item:', id);

        const { error } = await supabase
          .from('gear_items')
          .update(itemData)
          .eq('id', id);

        if (error) {
          console.error('❌ Update error:', error);

          if (error.code === 'PGRST301') {
            toast.error('Chyba přístupu', {
              description: 'Nemáte oprávnění upravit tuto položku.'
            });
          } else if (error.message.includes('unique constraint')) {
            toast.error('Duplikátní SKU', {
              description: 'Toto SKU již existuje. Použijte jiné.'
            });
          } else {
            toast.error('Nepodařilo se uložit', {
              description: error.message || 'Zkuste to znovu.'
            });
          }
          throw error;
        }

        toast.success('Položka aktualizována', {
          description: 'Změny byly úspěšně uloženy.'
        });
        console.log('✅ Item updated');
      } else {
        // Create new
        console.log('Creating new item');

        const { data, error } = await supabase
          .from('gear_items')
          .insert(itemData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);

          if (error.code === 'PGRST301') {
            toast.error('Chyba přístupu', {
              description: 'Nemáte oprávnění vytvořit položku.'
            });
          } else if (error.message.includes('unique constraint')) {
            toast.error('Duplikátní SKU', {
              description: 'Toto SKU již existuje. Použijte jiné.'
            });
          } else {
            toast.error('Nepodařilo se vytvořit položku', {
              description: error.message || 'Zkuste to znovu.'
            });
          }
          throw error;
        }

        // Insert additional images into gear_images table
        if (uploadedUrls.length > 1) {
          try {
            const imageRecords = uploadedUrls.slice(1).map((url, index) => ({
              gear_id: data.id,
              url,
              sort_order: index + 1,
            }));

            const { error: imgError } = await supabase
              .from('gear_images')
              .insert(imageRecords);

            if (imgError) {
              console.error('⚠️ Failed to save additional images:', imgError);
              toast.warning('Položka vytvořena', {
                description: 'Některé dodatečné obrázky se nepodařilo uložit.'
              });
            }
          } catch (imgError) {
            console.error('⚠️ Image insert error:', imgError);
          }
        }

        toast.success('Položka přidána', {
          description: 'Nová položka byla vytvořena v inventáři.'
        });
        console.log('✅ Item created:', data.id);
      }

      navigate('/provider/inventory');
    } catch (error) {
      console.error('💥 Error saving item:', error);

      const errorCode = getErrorCode(error);

      if (!errorCode && !isSupabaseConstraintError(error)) {
        if (isFetchError(error)) {
          toast.error('Chyba sítě', {
            description: 'Zkontrolujte připojení k internetu.'
          });
        } else {
          toast.error('Neočekávaná chyba', {
            description: 'Zkuste to znovu nebo kontaktujte podporu.'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
                />
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
              <CardTitle>Images (Max 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {existingImageUrl && images.length === 0 && (
                  <div className="relative aspect-square">
                    <img src={existingImageUrl} alt="Current" className="w-full h-full object-cover rounded-lg" />
                  </div>
                )}

                {images.map((file, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:border-green-500 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
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
                />
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
