<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:amount']);
const { t } = useI18n();

const amount = ref(1);

function increase() {
  amount.value++;
  emit('update:amount', amount.value);
}

function decrease() {
  if (amount.value > 1) {
    amount.value--;
    emit('update:amount', amount.value);
  }
}

// Initial emit
emit('update:amount', amount.value);
</script>

<template>
  <div class="flex flex-col items-center justify-center p-2 phone-xl:p-4">
    <!-- Eşya İkonu -->
    <div class="w-20 h-20 phone-xl:w-24 phone-xl:h-24 bg-[#ebd2aa] border-4 border-[#c7a473] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
      <img :src="item.img" class="w-16 h-16 phone-xl:w-20 phone-xl:h-20 object-contain drop-shadow-md transition-transform hover:scale-105" />
    </div>

    <!-- Miktar Seçici -->
    <div class="flex items-center gap-5 phone-xl:gap-6 mb-2">
      <button class="w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center border-b-[5px] border-red-700 shadow-md titre text-3xl active:border-b-0 active:translate-y-[5px] transition-all" @click="decrease">-</button>
      
      <div class="bg-[#ebd2aa] border-2 border-[#8b5e2b] rounded-lg min-w-[3.5rem] py-1 px-3 flex items-center justify-center shadow-inner">
        <span class="titre text-3xl phone-xl:text-4xl text-[#4a2e1b]">{{ amount }}</span>
      </div>
      
      <button class="w-12 h-12 bg-[#8bc34a] text-white rounded-xl flex items-center justify-center border-b-[5px] border-[#558b2f] shadow-md titre text-3xl active:border-b-0 active:translate-y-[5px] transition-all" @click="increase">+</button>
    </div>

    <!-- Toplam Tutar -->
    <div class="mt-4 flex items-center justify-center gap-2.5 bg-[#fceec9] border-2 border-[#d6b87d] px-4 py-2 rounded-xl shadow-sm">
      <span class="titre text-base phone-xl:text-lg text-[#5c3e21] tracking-wide">{{ t('total_price') || 'Total:' }}</span>
      <div class="flex items-center gap-1.5 ml-2">
        <img src="/assets/icons/diamond.png" class="w-8 h-8 phone-xl:w-9 phone-xl:h-9 object-contain drop-shadow-sm scale-110" />
        <span class="titre text-2xl phone-xl:text-3xl text-white button-text-shadow">{{ amount * item.price }}</span>
      </div>
    </div>
  </div>
</template>
