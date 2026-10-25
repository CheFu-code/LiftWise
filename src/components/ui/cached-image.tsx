import { Image as ExpoImage, type ImageProps } from "expo-image";
import { cssInterop } from "nativewind";
import { PixelRatio, StyleSheet } from "react-native";
import { imageUrl } from "@/lib/image-url";

type Props = Omit<ImageProps, "contentFit"> & {
  className?: string;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  imageWidth?: number;
};

function CachedImage({ source, resizeMode = "cover", imageWidth, ...props }: Props) {
  const width = imageWidth ?? StyleSheet.flatten(props.style)?.width;
  const requestedWidth = typeof width === "number" ? Math.min(960, Math.ceil(width * PixelRatio.get() / 160) * 160) : 960;
  const optimized =
    source &&
    typeof source === "object" &&
    !Array.isArray(source) &&
    "uri" in source &&
    typeof source.uri === "string"
      ? { ...source, uri: imageUrl(source.uri, requestedWidth) }
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
