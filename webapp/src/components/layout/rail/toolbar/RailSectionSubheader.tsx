"use client";
import type { ChangeEvent, ReactNode } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/retroui";
import { SearchField } from "@/components/ui/form";
import { RetroToolbarButton } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
export type RailSectionSubheaderSearchProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  wrapperClassName?: string;
  onFocus?: () => void;
}>;
export type RailSectionSubheaderSortProps = Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  widthClass?: string;
}>;
export type RailSectionSubheaderButtonProps = Readonly<{
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary";
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>;
function hasRailLabel(label: ReactNode | undefined): boolean {
  if (label == null) return false;
  if (typeof label === "string") return label.trim().length > 0;
  return true;
}
function hasRailText(text: ReactNode | undefined): boolean {
  if (text == null) return false;
  if (typeof text === "string") return text.trim().length > 0;
  return true;
}
export type RailSectionSubheaderFilterProps = RailSectionSubheaderSortProps;
export type RailSectionSubheaderProps = Readonly<{
  leading?: ReactNode;
  label?: ReactNode;
  text?: ReactNode;
  search?: RailSectionSubheaderSearchProps;
  filter?: RailSectionSubheaderFilterProps;
  sort?: RailSectionSubheaderSortProps;
  buttons?: ReadonlyArray<RailSectionSubheaderButtonProps>;
  swiperButtons?: ReactNode;
  className?: string;
}>;
export function RailSectionSubheaderButton({
  label,
  href,
  onClick,
  variant = "default",
  className,
  ariaLabel,
  disabled = false,
}: RailSectionSubheaderButtonProps) {
  return (
    <RetroToolbarButton
      label={label}
      href={href}
      onClick={onClick}
      variant={variant}
      className={className}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );
}
function RailToolbarButtons({
  buttons,
  nowrap = false,
}: Readonly<{
  buttons: ReadonlyArray<RailSectionSubheaderButtonProps>;
  nowrap?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1",
        nowrap ? "flex-nowrap" : "flex-wrap",
      )}
    >
      {buttons.map((btn, i) => (
        <RailSectionSubheaderButton
          key={btn.href ?? btn.ariaLabel ?? i}
          {...btn}
        />
      ))}
    </div>
  );
}
export function RailSectionSubheader({
  leading,
  label,
  text,
  search,
  filter,
  sort,
  buttons,
  swiperButtons,
  className,
}: RailSectionSubheaderProps) {
  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    search?.onChange(e.target.value);
  };
  const showLabel = hasRailLabel(label);
  const showText = hasRailText(text);
  const hasButtons = buttons != null && buttons.length > 0;
  const buttonsOnLeft = hasButtons && !showText && leading == null;
  const buttonsOnRight = hasButtons && (showText || leading != null);
  const compactButtonsWithSearch = buttonsOnLeft && search != null;
  const searchField =
    search != null ? (
      <SearchField
        value={search.value}
        onChange={onSearchChange}
        onFocus={search.onFocus}
        placeholder={search.placeholder ?? "Search…"}
        aria-label={search.ariaLabel}
        disabled={search.disabled}
        wrapperClassName={cn(
          "h-[42px] w-[12.5rem] max-w-none shrink-0 sm:w-[16.5rem] sm:max-w-none",
          search.wrapperClassName,
        )}
      />
    ) : null;
  const leftCluster =
    leading != null ? (
      <div className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
        {leading}
      </div>
    ) : (
      <div className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        {showLabel ? (
          <div className="shrink-0 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
        ) : null}
        {showText ? (
          <div className="min-w-0 flex-1 truncate font-sans text-sm font-bold leading-none text-foreground sm:text-base">
            {text}
          </div>
        ) : buttonsOnLeft ? (
          <RailToolbarButtons buttons={buttons} />
        ) : null}
      </div>
    );
  return (
    <div className={cn("w-full min-w-0", className)}>
      <div
        className={cn(
          "flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-2 border-border bg-white px-3 py-2 shadow sm:gap-x-4 sm:px-4 sm:py-2.5 dark:bg-card",
        )}
      >
        {compactButtonsWithSearch ? (
          <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-h-[42px] min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max items-center pr-1">
                <RailToolbarButtons buttons={buttons} nowrap />
              </div>
            </div>
            <div className="shrink-0">{searchField}</div>
          </div>
        ) : (
          <>
            {leftCluster}
            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-2">
              {searchField != null ? (
                <div className="flex shrink-0 items-center">{searchField}</div>
              ) : null}
              {filter != null ? (
                <div className="flex shrink-0 items-center">
                  <SearchableSelect
                    id={filter.id}
                    label=""
                    placeholder={filter.placeholder ?? "Filter"}
                    value={filter.value}
                    onChange={filter.onChange}
                    options={filter.options}
                    disabled={filter.disabled}
                    searchable={false}
                    listMaxHeight={220}
                    widthClass={
                      filter.widthClass ?? "w-[8.75rem] sm:w-[9.75rem]"
                    }
                    className="gap-0 [&>label]:hidden"
                    triggerClassName="h-[42px]  py-0 font-mono text-[10px] font-black uppercase tracking-widest"
                    listboxClassName=" shadow-none"
                  />
                </div>
              ) : null}
              {sort != null ? (
                <div className="flex shrink-0 items-center">
                  <SearchableSelect
                    id={sort.id}
                    label=""
                    placeholder={sort.placeholder ?? "Sort"}
                    value={sort.value}
                    onChange={sort.onChange}
                    options={sort.options}
                    disabled={sort.disabled}
                    searchable={false}
                    listMaxHeight={220}
                    widthClass={sort.widthClass ?? "w-[8.75rem] sm:w-[9.75rem]"}
                    className="gap-0 [&>label]:hidden"
                    triggerClassName="h-[42px]  py-0 font-mono text-[10px] font-black uppercase tracking-widest"
                    listboxClassName=" shadow-none"
                  />
                </div>
              ) : null}
              {buttonsOnRight ? <RailToolbarButtons buttons={buttons} /> : null}
              {swiperButtons != null ? (
                <div className="flex shrink-0 items-center gap-1">
                  {swiperButtons}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
