import { MapPin, BedDouble, Maximize, AreaChart } from "lucide-react";

interface PropertyCardProps {
  image: string;
  location: string;
  beds: number;
  area: string;
  lot: string;
  price: string;
}

const PropertyCard = ({ image, location, beds, area, lot, price }: PropertyCardProps) => {
  return (
    <div className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          alt={location}
          loading="lazy"
          width={640}
          height={512}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-gold mb-3">
          <MapPin size={14} />
          <span className="text-sm font-medium">{location}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <BedDouble size={14} className="text-gold" /> {beds} Rec
          </span>
          <span className="flex items-center gap-1">
            <Maximize size={14} className="text-gold" /> {area}
          </span>
          <span className="flex items-center gap-1">
            <AreaChart size={14} className="text-gold" /> {lot}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <button className="bg-gold text-accent-foreground text-xs font-semibold px-4 py-2 rounded hover:bg-gold-light transition-colors">
            Agendar Visita
          </button>
          <span className="font-heading text-base font-bold text-foreground">{price}</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
