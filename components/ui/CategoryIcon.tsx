import {
  Languages,
  BarChart3,
  Headphones,
  Code2,
  DollarSign,
  TrendingUp,
  Scale,
  Image,
  Server,
  BookOpen,
  Calendar,
  Shield,
  ShoppingCart,
  Brain,
  Monitor,
  Database,
  Phone,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Languages,
  BarChart3,
  Headphones,
  Code2,
  DollarSign,
  TrendingUp,
  Scale,
  Image,
  Server,
  BookOpen,
  Calendar,
  Shield,
  ShoppingCart,
  Brain,
  Monitor,
  Database,
  Phone,
};

export function CategoryIcon({
  name,
  className = 'w-5 h-5',
}: {
  name?: string;
  className?: string;
}) {
  if (!name) return <span className={className}>🤖</span>;

  const Icon = iconMap[name];
  if (!Icon) return <span className="text-lg">{name}</span>;

  return <Icon className={className} />;
}
