import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "title-1",
            "title-2",
            "title-3",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "label-1",
            "label-2",
            "label-3",
            "body-1",
            "body-2",
            "body-3",
            "body-4",
            "caption-1",
            "caption-2",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
