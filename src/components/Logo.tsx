import Image from 'next/image'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export default function Logo({
  className = '',
  width = 32,
  height = 32,
}: LogoProps) {
  const logoPath = '/logo.svg' // Use the main logo

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src={logoPath}
        alt='PDF Analyzer Logo'
        fill
        style={{ objectFit: 'contain' }}
        priority
      />
    </div>
  )
}
