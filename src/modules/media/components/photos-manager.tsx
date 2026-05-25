import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { removeImageAction } from "@/modules/media/actions";

/** Photo grid + remove + upload for a listing or product (seller-only). */
export function PhotosManager({
  entityType,
  entityId,
  photos,
}: {
  entityType: "listing" | "product";
  entityId: string;
  photos: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[4/3] w-full rounded-md border object-cover" />
                <form action={removeImageAction} className="absolute right-1 top-1">
                  <input type="hidden" name="entityType" value={entityType} />
                  <input type="hidden" name="entityId" value={entityId} />
                  <input type="hidden" name="url" value={url} />
                  <Button type="submit" size="sm" variant="destructive" className="h-7 px-2 text-xs">
                    Remove
                  </Button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photos yet. Add one below.</p>
        )}
        <ImageUploader entityType={entityType} entityId={entityId} />
      </CardContent>
    </Card>
  );
}
