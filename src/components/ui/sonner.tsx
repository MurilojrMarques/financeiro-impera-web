import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/**
 * Canto inferior direito no desktop; no celular os avisos sobem acima da barra de navegação inferior
 * (altura da barra + área segura), para nunca cobrir os botões de navegação.
 */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      closeButton
      offset={24}
      mobileOffset={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))', left: 12, right: 12 }}
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-foreground !border-border !shadow-xl',
          description: '!text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
