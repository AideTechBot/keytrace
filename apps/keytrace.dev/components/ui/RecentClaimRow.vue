<template>
  <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-kt-surface border border-zinc-800/50 hover:border-zinc-700/50 transition-colors group">
    <!-- User Avatar -->
    <img v-if="claim.avatar" :src="claim.avatar" :alt="claim.handle" class="w-8 h-8 rounded-full bg-zinc-800" />
    <div v-else class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
      <UserIcon class="w-4 h-4 text-zinc-600" />
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
      <NuxtLink :to="`/@${claim.handle}`" class="text-sm text-zinc-200 hover:text-white font-medium transition-colors">
        {{ claim.handle }}
      </NuxtLink>
      <span class="text-zinc-600 text-sm">verified</span>
      <!-- Identity info with avatar if available -->
      <div class="flex items-center gap-1.5">
        <img
          v-if="claim.identity?.avatarUrl"
          :src="claim.identity.avatarUrl"
          :alt="identityDisplay"
          class="w-4 h-4 rounded-full"
        />
        <span class="text-sm text-violet-400 font-medium">
          {{ identityDisplay }}
        </span>
      </div>
    </div>

    <!-- Service icon + timestamp -->
    <div class="flex items-center gap-3 text-xs text-zinc-500">
      <component :is="serviceIcon" :class="iconClass" />
      <span v-if="claim.createdAt">{{ relativeTime(claim.createdAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Github, Globe, AtSign, Key, User as UserIcon } from "lucide-vue-next";
import NpmIcon from "~/components/icons/NpmIcon.vue";

export interface RecentClaimIdentity {
  subject?: string;
  avatarUrl?: string;
  profileUrl?: string;
  displayName?: string;
}

export interface RecentClaim {
  handle: string;
  avatar?: string;
  displayName: string;
  serviceType?: string;
  createdAt?: string;
  identity?: RecentClaimIdentity;
}

const props = defineProps<{
  claim: RecentClaim;
}>();

const serviceIcons: Record<string, any> = {
  github: Github,
  "github-gist": Github,
  domain: Globe,
  dns: Globe,
  mastodon: AtSign,
  fediverse: AtSign,
  npm: NpmIcon,
};

const serviceIcon = computed(() => serviceIcons[props.claim.serviceType ?? ""] ?? Key);

// npm icon needs different sizing
const iconClass = computed(() => {
  if (props.claim.serviceType === "npm") {
    return "w-5 h-5";
  }
  return "w-4 h-4";
});

// Show identity name - prefer displayName, then subject, then fall back to service display name
const identityDisplay = computed(() => {
  if (props.claim.identity?.displayName) {
    return props.claim.identity.displayName;
  }
  if (props.claim.identity?.subject) {
    return props.claim.identity.subject;
  }
  return props.claim.displayName;
});

function relativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
</script>
