interface YouTubePlayerProps {
  videoId: string
}

export default function YouTubePlayer({ videoId }: YouTubePlayerProps) {
  return (
    <iframe
      data-testid="youtube-player"
      className="w-full h-full"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}
