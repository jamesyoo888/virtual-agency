import Link from "next/link";
import Image from "next/image";
import { Model } from "@/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  model: Model;
  variant: "admin" | "showcase";
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function ModelCard({ model, variant }: Props) {
  const href =
    variant === "admin"
      ? `/admin/models/${model.id}`
      : `/models/${model.id}`;

  const debutDate = model.debut_date ? new Date(model.debut_date) : null;
  const ageYears = debutDate
    ? Math.floor((Date.now() - debutDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <Link href={href} className="group block">
      <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 mb-3">
        {model.concept_image ? (
          <Image
            src={model.concept_image}
            alt={model.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
            No image
          </div>
        )}

        {variant === "admin" && (
          <div className="absolute top-2 right-2">
            <Badge className={STATUS_COLORS[model.status]}>
              {model.status}
            </Badge>
          </div>
        )}

        {variant === "showcase" && model.is_exclusive_available && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-white/10 text-white border-white/20 text-xs">
              독점가능
            </Badge>
          </div>
        )}
      </div>

      <div>
        <p className="font-medium text-sm group-hover:text-zinc-300 transition-colors">
          {model.name}
        </p>
        {ageYears !== null && (
          <p className="text-xs text-zinc-500 mt-0.5">생체나이 {ageYears}세</p>
        )}
        {variant === "showcase" && model.base_price && (
          <p className="text-xs text-zinc-400 mt-0.5">
            ₩{model.base_price.toLocaleString()} / 일
          </p>
        )}
        {variant === "admin" && (
          <p className="text-xs text-zinc-500 mt-0.5">
            팔로워 {model.follower_count.toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}
