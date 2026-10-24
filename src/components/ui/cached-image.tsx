import { Image as ExpoImage, type ImageProps } from "expo-image";
import { cssInterop } from "nativewind";
import { imageUrl } from "@/lib/image-url";

type Props = Omit<ImageProps, "contentFit"> & {
  className?: string;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
};

function CachedImage({ source, resizeMode = "cover", ...props }: Props) {
  const optimized =
    source &&
    typeof source === "object" &&
    !Array.isArray(source) &&
    "uri" in source &&
    typeof source.uri === "string"
      ? { ...source, uri: imageUrl(source.uri) }
      : source;
  return (
    <ExpoImage
      {...props}
      source={optimized}
      contentFit={
        resizeMode === "stretch"
          ? "fill"
          : resizeMode === "center"
            ? "none"
            : resizeMode
      }
      recyclingKey={
        optimized && typeof optimized === "object" && "uri" in optimized
          ? optimized.uri
          : undefined
      }
      cachePolicy="memory-disk"
      transition={120}
    />
  );
}
cssInterop(CachedImage, { className: "style" });
export default CachedImage;
