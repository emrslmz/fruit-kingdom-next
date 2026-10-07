// Oyundaki meyve türleri. `id` aynı zamanda game-atlas içindeki kare adıdır
// (`${id}.png`) ve /assets/fruits altındaki tekil görselin adıdır.
export const FRUIT_TYPES = [
  { id: 'apple', name: 'Apple' },
  { id: 'bamboo', name: 'Bamboo' },
  { id: 'banana', name: 'Banana' },
  { id: 'berry', name: 'Berry' },
  { id: 'carrot', name: 'Carrot' },
  { id: 'cherry', name: 'Cherry' },
  { id: 'coconut', name: 'Coconut' },
  { id: 'grape', name: 'Grape' },
  { id: 'lemon', name: 'Lemon' },
  { id: 'orange', name: 'Orange' },
  { id: 'pear', name: 'Pear' },
  { id: 'pulm', name: 'Pulm' },
  { id: 'strawberry', name: 'Strawberry' },
  { id: 'watermelon', name: 'Watermelon' },
].map(f => ({ ...f, imgPath: `/assets/fruits/${f.id}.png` }))

export const FRUIT_IDS = FRUIT_TYPES.map(f => f.id)

export function isFruit(id) {
  return FRUIT_IDS.includes(id)
}
