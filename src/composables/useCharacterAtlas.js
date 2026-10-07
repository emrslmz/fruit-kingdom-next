import { ref, computed } from 'vue'

// Global atlas verileri - tüm bileşenler arasında paylaşılır
const atlasData = ref(null)
const isLoading = ref(false)
const isLoaded = ref(false)
let cssInjected = false

export function useCharacterAtlas() {
  // CSS sprite sınıflarını dinamik olarak enjekte et
  const injectCSS = () => {
    if (cssInjected || !atlasData.value) return
    
    const style = document.createElement('style')
    style.id = 'character-atlas-css'
    
    // Base CSS sınıfı
    let css = `
.character-sprite {
  background-image: url('/assets/sprites/character-atlas.png');
  background-repeat: no-repeat;
  display: inline-block;
}
`
    
    // Her karakter için ayrı CSS sınıfı oluştur
    atlasData.value.textures[0].frames.forEach(frame => {
      const className = frame.filename.replace(/[^a-zA-Z0-9]/g, '_')
      css += `
.character-sprite.${className} {
  background-position: -${frame.frame.x}px -${frame.frame.y}px;
  width: ${frame.frame.w}px;
  height: ${frame.frame.h}px;
}
`
    })
    
    style.textContent = css
    document.head.appendChild(style)
    cssInjected = true
  }

  // Eğer daha önce yüklenmediyse veya yüklenme işlemi devam etmiyorsa yükle
  const loadAtlas = async () => {
    if (isLoaded.value || isLoading.value) {
      return atlasData.value
    }

    isLoading.value = true
    
    try {
      const res = await fetch('/assets/sprites/character-atlas.json')
      const data = await res.json()
      atlasData.value = data
      isLoaded.value = true
      
      // CSS'i enjekte et
      injectCSS()
    } catch (error) {
      console.error('Character atlas yüklenemedi:', error)
    } finally {
      isLoading.value = false
    }

    return atlasData.value
  }

  // Karakter için CSS sınıf adını döndür
  const getCharacterClass = (spriteName) => {
    if (!spriteName) return ''
    return spriteName.replace(/[^a-zA-Z0-9]/g, '_')
  }

  return {
    atlasData,
    isLoading,
    isLoaded,
    loadAtlas,
    getCharacterClass
  }
}
