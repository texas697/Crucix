import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';

export const P = ({ className, ...props }: ComponentPropsWithoutRef<'p'>) => <p {...props} className={clsx(CLASSES.text, className)} />;

export const H2 = ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => <h2 {...props} className={clsx(CLASSES.heading, className)} />;

export const H3 = ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => <h3 {...props} className={clsx(CLASSES.subheading, className)} />;

export const Ul = ({ className, ...props }: ComponentPropsWithoutRef<'ul'>) => <ul {...props} className={clsx(CLASSES.list, className)} />;

export const Ol = ({ className, ...props }: ComponentPropsWithoutRef<'ol'>) => <ol {...props} className={clsx(CLASSES.orderedList, className)} />;

export const Li = ({ className, ...props }: ComponentPropsWithoutRef<'li'>) => <li {...props} className={clsx(CLASSES.item, className)} />;

export const Strong = ({ className, ...props }: ComponentPropsWithoutRef<'strong'>) => <strong {...props} className={clsx(CLASSES.strong, className)} />;

export const Em = ({ className, ...props }: ComponentPropsWithoutRef<'em'>) => <em {...props} className={clsx(CLASSES.em, className)} />;

export const Br = ({ className, ...props }: ComponentPropsWithoutRef<'br'>) => <br {...props} className={clsx(CLASSES.break, className)} />;

export const A = ({ className, ...props }: ComponentPropsWithoutRef<'a'>) => <a {...props} className={clsx(CLASSES.link, className)} />;

export const Table = ({ className, ...props }: ComponentPropsWithoutRef<'table'>) => <table {...props} className={clsx(CLASSES.table, className)} />;

export const Tr = ({ className, ...props }: ComponentPropsWithoutRef<'tr'>) => <tr {...props} className={clsx(CLASSES.row, className)} />;

export const Th = ({ className, ...props }: ComponentPropsWithoutRef<'th'>) => <th {...props} className={clsx(CLASSES.headerCell, className)} />;

export const Td = ({ className, ...props }: ComponentPropsWithoutRef<'td'>) => <td {...props} className={clsx(CLASSES.cell, className)} />;

export const Details = ({ className, ...props }: ComponentPropsWithoutRef<'details'>) => <details {...props} className={clsx(CLASSES.details, className)} />;

export const Summary = ({ className, ...props }: ComponentPropsWithoutRef<'summary'>) => <summary {...props} className={clsx(CLASSES.summary, className)} />;
