<script>
export default {
  name: '404Error',
}
</script>

<template>
  <div class="bg-gray-100 h-screen w-full">
    <div class="h-full flex justify-center items-center text-black">
      <div class=" px-5">
        <div class="text-5xl font-dark font-bold">
          Uppsss...
          <strong> 404 </strong>
        </div>
        <p
          class="text-2xl md:text-3xl font-light leading-normal"
        >
          <strong>Aradığınız sayfayı bulamadık...</strong>
        </p>

        <router-link to="/" class="mb-8">
          Görünüşe göre bir şeyler deniyorsunuz. Ana sayfaya gitmek için <strong class="text-blue-500">tıklayın!</strong>
        </router-link>
      </div>
    </div>
  </div>
</template>
