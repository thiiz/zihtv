# Como usar o componente Image personalizado

Este projeto utiliza um componente Image personalizado que permite carregar imagens de qualquer domínio sem a necessidade de configurar cada domínio individualmente no `next.config.js`.

## Importação

```tsx
import Image from '@/components/Image';
```

## Uso básico

```tsx
<Image 
  src="https://qualquer-dominio.com/imagem.jpg" 
  alt="Descrição da imagem" 
  width={300} 
  height={200} 
/>
```

## Com tratamento de falha personalizado

```tsx
<Image 
  src="https://qualquer-dominio.com/imagem.jpg" 
  alt="Descrição da imagem" 
  width={300} 
  height={200} 
  fallbackSrc="/caminho/para/imagem-de-fallback.png" // Opcional - padrão é "/placeholder-image.svg"
/>
```

## Outras propriedades

Este componente suporta todas as propriedades do componente `next/image`, como:

- `layout` - "fixed", "intrinsic", "responsive", ou "fill"
- `objectFit` - "contain", "cover", "fill", "none", ou "scale-down"
- `quality` - Um número entre 1-100, onde 100 é a melhor qualidade
- `priority` - Booleano para carregamento prioritário
- `loading` - "lazy" ou "eager"

## Como funciona

O componente usa um loader personalizado que:

1. Permite imagens de qualquer domínio
2. Adiciona parâmetros de largura e qualidade à URL da imagem quando apropriado
3. Trata erros de carregamento, substituindo imagens com falha por uma imagem padrão

## Exemplo completo

```tsx
import Image from '@/components/Image';

export default function MinhaPagina() {
  return (
    <div>
      <h1>Minha Página</h1>
      <Image 
        src="https://k120.live:80/images/exemplo.png" 
        alt="Exemplo de imagem" 
        width={400} 
        height={300}
        objectFit="cover"
        quality={85}
        className="rounded-lg shadow-md"
      />
    </div>
  );
}
``` 