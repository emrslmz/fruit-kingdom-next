<script setup>
import ToastContainer from '@/components/ToastContainer.vue'
import AlertModal from '@/components/AlertModal.vue'
</script>

<template>
  <div class="h-screen bg-black">
    <router-view />

    <ToastContainer />
    <AlertModal />
  </div>
</template>
