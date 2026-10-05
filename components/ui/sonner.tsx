import {
  CheckCheck,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "@/components/icons";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // 10px glyph in the 21px circle below — the Tost component in Figma
      // (Karbon — AI Accountant, node 21859:147791) draws a 10.284px status
      // icon centred in a 21px round ground.
      icons={{
        success: <CheckCheck size={10} />,
        error: <CircleAlert size={10} />,
        warning: <TriangleAlert size={10} />,
        info: <Info size={10} />,
        loading: <LoaderCircle size={10} className="animate-spin" />,
        close: <X size={9} strokeWidth={2.5} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-surface-muted group-[.toaster]:shadow-toast rounded-md p-3 gap-2 items-start",
          // 14/20 at -0.16 and 12/16 at -0.12 are Label-2 Semi Bold and
          // Label-3 Regular from the Figma file's type scale.
          title: "text-sm font-semibold leading-5 tracking-[-0.16px]",
          description:
            "text-xs font-normal leading-4 tracking-[-0.12px] text-white/80",
          content: "flex-1 gap-1",
          icon: "flex h-[21px] w-[21px] items-center justify-center rounded-full [&_svg]:shrink-0",
          loader:
            "flex h-[21px] w-[21px] items-center justify-center rounded-full bg-surface-muted text-primary-foreground [&_svg]:shrink-0",
          actionButton:
            "group-[.toast]:!bg-surface-muted group-[.toast]:!text-primary-foreground border-0 p-1 text-xs shadow-none transition-colors hover:!bg-surface-muted gap-1",
          cancelButton:
            "group-[.toast]:!bg-surface-muted group-[.toast]:!text-primary-foreground border-0 p-1 text-xs shadow-none transition-colors hover:!bg-surface-muted gap-1",
          closeButton:
            "!left-auto !right-0 !top-0 !translate-x-[40%] !-translate-y-[40%] !h-6 !w-6 !rounded-full !border !border-background/10 !bg-surface-muted !text-primary-foreground/70 !shadow-none opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto hover:!bg-surface-muted hover:!text-primary-foreground focus:!opacity-100 focus:!pointer-events-auto group-[[data-type=loading]]:!hidden [&_svg]:!h-3 [&_svg]:!w-3",
          // The ground stays --surface in every state; only the icon circle
          // changes, which is how the Figma component carries status.
          success:
            "[&_[data-icon]]:bg-status-success [&_[data-icon]]:text-surface",
          error: "[&_[data-icon]]:bg-status-error [&_[data-icon]]:text-surface",
          warning:
            "[&_[data-icon]]:bg-status-warning [&_[data-icon]]:text-surface",
          // No status colour to carry, so the circle takes the component's
          // neutral ground — the same one its in-progress variant uses.
          info: "[&_[data-icon]]:bg-surface-muted [&_[data-icon]]:text-primary-foreground",
        },
        actionButtonStyle: { alignSelf: "center" },
        cancelButtonStyle: { alignSelf: "center" },
      }}
      {...props}
    />
  );
};

export { Toaster };
