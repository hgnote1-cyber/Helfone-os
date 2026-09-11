# Como colocar o app Helfone OS no ar

São 2 contas gratuitas: Supabase (banco de dados) e Vercel (hospedagem).
Depois disso, todo mundo da loja acessa por um link, de qualquer celular.

## 1. Criar o banco de dados (Supabase)

1. Entre em https://supabase.com e crie uma conta grátis (pode ser com Google).
2. Clique em "New project". Dê um nome (ex: helfone-os) e uma senha forte pro banco
   (guarde essa senha, mas você não vai precisar usar ela no dia a dia).
3. Espere o projeto terminar de criar (leva 1-2 minutos).
4. No menu da esquerda, clique em "SQL Editor" → "New query".
5. Abra o arquivo `supabase.sql` que veio junto com este projeto, copie todo o
   conteúdo, cole no editor e clique em "Run".
6. No menu da esquerda, clique em "Project Settings" → "API".
   Você vai precisar de 3 coisas dessa tela:
   - "Project URL"
   - "anon public" key
   - "service_role" key (clique em "Reveal" pra ver)

## 2. Subir o código pro GitHub

1. Crie uma conta em https://github.com (grátis).
2. Crie um repositório novo (botão verde "New").
3. Suba os arquivos desta pasta pra esse repositório (pode arrastar os arquivos
   pela própria página do GitHub, em "uploading an existing file").

## 3. Publicar no ar (Vercel)

1. Entre em https://vercel.com e crie conta (dá pra entrar direto com a conta
   do GitHub, é mais rápido).
2. Clique em "Add New" → "Project" e escolha o repositório que você subiu.
3. Antes de clicar em "Deploy", abra "Environment Variables" e adicione 3
   variáveis, usando os valores que você pegou no Supabase no passo 1.6:
   - `NEXT_PUBLIC_SUPABASE_URL` → o "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → a "anon public" key
   - `SUPABASE_SERVICE_ROLE_KEY` → a "service_role" key
4. Clique em "Deploy". Em 1-2 minutos o Vercel te dá um link tipo
   `helfone-os.vercel.app` — esse é o endereço do app.

## 4. Usar no celular

1. Abra esse link no navegador do celular.
2. No menu do navegador, escolha "Adicionar à tela inicial" (Chrome/Android)
   ou "Adicionar à Tela de Início" (Safari/iPhone).
3. Pronto — vira um ícone de app normal, e como os dados ficam no Supabase,
   todo mundo que abrir o mesmo link vê as mesmas ordens de serviço.

## Se precisar mudar algo depois

Qualquer ajuste de tela ou de campo, é só me pedir de novo aqui que eu
atualizo os arquivos — você só precisa subir a versão nova pro GitHub
(ou eu te aviso exatamente quais arquivos trocar) e o Vercel atualiza sozinho.
