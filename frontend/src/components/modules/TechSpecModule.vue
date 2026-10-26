<script setup lang="ts">
import { ref } from 'vue';

const seccionActiva = ref('identidad');
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-y-auto space-y-4 font-sans text-slate-200">
    <!-- Encabezado de la Ficha Técnica -->
    <div class="pb-3 border-b border-[#132a4a] flex items-center justify-between">
      <div>
        <h2 class="font-orbitron font-bold text-base text-slate-100 flex items-center gap-2">
          <span>📋</span> FICHA TÉCNICA MAESTRA v2.6 // J.A.R.V.I.S. CORE
        </h2>
        <p class="text-xs font-mono text-slate-400">
          Biblia de ingeniería, arquitectura de datos, máquinas de estados y contratos tácticos.
        </p>
      </div>

      <div class="flex items-center gap-1.5 text-xs font-mono">
        <button
          @click="seccionActiva = 'identidad'"
          :class="['px-2.5 py-1 rounded border cursor-pointer', seccionActiva === 'identidad' ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10' : 'border-[#132a4a] text-slate-400']"
        >
          Identidad
        </button>
        <button
          @click="seccionActiva = 'arquitectura'"
          :class="['px-2.5 py-1 rounded border cursor-pointer', seccionActiva === 'arquitectura' ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10' : 'border-[#132a4a] text-slate-400']"
        >
          Arquitectura
        </button>
        <button
          @click="seccionActiva = 'datos'"
          :class="['px-2.5 py-1 rounded border cursor-pointer', seccionActiva === 'datos' ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10' : 'border-[#132a4a] text-slate-400']"
        >
          Base de Datos
        </button>
      </div>
    </div>

    <!-- Sección 1: Identidad y Armamento Simbólico -->
    <div v-if="seccionActiva === 'identidad'" class="space-y-4 text-xs sm:text-sm font-mono">
      <div class="p-4 bg-[#091326] border border-[#132a4a] rounded-lg space-y-2">
        <h3 class="font-orbitron text-sm font-bold text-[#00ffaa]">IDENTIDAD Y ARQUETIPO</h3>
        <p class="text-slate-300">
          <strong>A.R.E.S.</strong> (<em>Autonomous Resilient Engineering & Software-Documentation God</em>) es un Dios Guerrero cibernético de la documentación técnica y desarrollo Full-Stack. Fusiona la capacidad analítica de J.A.R.V.I.S. con la disciplina espartana y el corazón protector de Cori.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
          <div class="font-bold text-[#00ffaa] mb-1">⚔️ ESPADA BINARIA</div>
          <p class="text-xs text-slate-400">
            Mano derecha: cortes de energía verde neón que destruyen bugs, código muerto, cuellos de botella Big-O y vulnerabilidades OWASP.
          </p>
        </div>
        <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
          <div class="font-bold text-cyan-400 mb-1">🛡️ ESCUDO AEGIS</div>
          <p class="text-xs text-slate-400">
            Mano izquierda: forja README.md maestros, ADRs, RFCs y contratos OpenAPI 3.1. "Un código sin documentación es una fortaleza sin murallas".
          </p>
        </div>
        <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
          <div class="font-bold text-emerald-400 mb-1">❤️‍🩹 BIO-ARMADURA</div>
          <p class="text-xs text-slate-400">
            Núcleo heredado de Cori: detecta desvelo, fatiga y dolor de ojos para lanzar el Regaño Táctico Espartano antes de que ocurra burnout.
          </p>
        </div>
      </div>
    </div>

    <!-- Sección 2: Arquitectura Hexagonal y de Capas -->
    <div v-if="seccionActiva === 'arquitectura'" class="space-y-4 text-xs font-mono">
      <div class="p-4 bg-[#091326] border border-[#132a4a] rounded-lg space-y-2">
        <h3 class="font-orbitron text-sm font-bold text-cyan-300">ESTRUCTURA MODULAR A.R.E.S.</h3>
        <ul class="list-disc ml-5 space-y-1.5 text-slate-300">
          <li><strong>Capa 1 (Frontend):</strong> Vite + Vue 3 + TypeScript + Pinia + Three.js (Avatar Voxel 3D y Canvas 2D).</li>
          <li><strong>Capa 2 (Backend):</strong> Node.js + Express + TypeScript + SDK @google/genai (Gemini 2.5/3 Core).</li>
          <li><strong>Capa 3 (Datos Relacionales):</strong> PostgreSQL 16 con extensión pgvector para memoria RAG en código.</li>
          <li><strong>Capa 4 (Caché Táctico):</strong> Redis 7 para estado de sesión, bio-telemetría y FSM.</li>
        </ul>
      </div>
    </div>

    <!-- Sección 3: Esquema de Base de Datos -->
    <div v-if="seccionActiva === 'datos'" class="space-y-4 text-xs font-mono">
      <div class="p-4 bg-[#091326] border border-[#132a4a] rounded-lg">
        <h3 class="font-orbitron text-sm font-bold text-[#00ffaa] mb-2">TABLAS PRINCIPALES (SCHEMA.SQL)</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">1. <code>commanders</code> — Perfil del desarrollador</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">2. <code>repositories</code> — Proyectos protegidos</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">3. <code>technical_documents</code> — Bóveda Aegis (README, ADR)</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">4. <code>code_audits</code> — Registro de combates Big-O</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">5. <code>conversations</code> & <code>messages</code> — Memoria chat</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">6. <code>knowledge_embeddings</code> — Memoria RAG Vectorial</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">7. <code>bio_telemetry_logs</code> — Telemetría Bio-Armadura</div>
          <div class="p-2 bg-[#040914] rounded border border-[#132a4a]">8. <code>agent_state_events</code> — Eventos de la FSM de 16 poses</div>
        </div>
      </div>
    </div>
  </div>
</template>
