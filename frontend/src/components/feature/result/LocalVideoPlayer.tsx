interface LocalVideoPlayerProps {
  src: string
}

export default function LocalVideoPlayer({ src }: LocalVideoPlayerProps) {
  return (
    <video
      data-testid="local-video-player"
      className="w-full h-full"
      src={src}
      controls
      controlsList="nodownload"
    />
  )
}
