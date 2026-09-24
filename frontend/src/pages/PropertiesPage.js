import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  getProperties, createProperty, updateProperty, deleteProperty,
  getPropertyUnits, createUnit, updateUnit, updateUnitStatus 
} from '../services/propertyApi';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import '../assets/css/modules.css';

export default function PropertiesPage() {
  const { user } = useAuth();
  const isAdminOrLandlord = ['admin', 'landlord'].includes(user?.role);
  
  const [activeView, setActiveView] = useState('list');
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Forms state
  const [propertyForm, setPropertyForm] = useState({
    name: '', property_type: 'Apartment', description: '',
    address_line1: '', address_line2: '', city: '', county: '', postal_code: ''
  });
  
  const [unitForm, setUnitForm] = useState({
    unit_number: '', floor_number: '', bedrooms: 0, bathrooms: 1,
    size_sqm: '', monthly_rent: '', security_deposit: '', status: 'available', description: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async (propertyId) => {
    try {
      setLoading(true);
      const data = await getPropertyUnits(propertyId);
      setUnits(data);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const openPropertyModal = (prop = null) => {
    if (prop) {
      setEditingProperty(prop);
      setPropertyForm({
        name: prop.name, property_type: prop.property_type, description: prop.description || '',
        address_line1: prop.address_line1, address_line2: prop.address_line2 || '',
        city: prop.city, county: prop.county, postal_code: prop.postal_code || ''
      });
    } else {
      setEditingProperty(null);
      setPropertyForm({
        name: '', property_type: 'Apartment', description: '',
        address_line1: '', address_line2: '', city: '', county: '', postal_code: ''
      });
    }
    setIsPropertyModalOpen(true);
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, propertyForm);
        toast.success('Property updated');
      } else {
        await createProperty(propertyForm);
        toast.success('Property created');
      }
      setIsPropertyModalOpen(false);
      fetchProperties();
    } catch (err) {
      toast.error(err.friendlyMessage || 'An error occurred');
    }
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    try {
      await deleteProperty(propertyToDelete.id);
      toast.success('Property deleted');
      fetchProperties();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to delete property');
    }
  };

  const viewUnits = (property) => {
    setSelectedProperty(property);
    setActiveView('detail');
    fetchUnits(property.id);
  };

  const openUnitModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        ...unit,
        description: unit.description || '',
        floor_number: unit.floor_number || '',
        size_sqm: unit.size_sqm || ''
      });
    } else {
      setEditingUnit(null);
      setUnitForm({
        unit_number: '', floor_number: '', bedrooms: 0, bathrooms: 1,
        size_sqm: '', monthly_rent: '', security_deposit: '', status: 'available', description: ''
      });
    }
    setIsUnitModalOpen(true);
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await updateUnit(selectedProperty.id, editingUnit.id, unitForm);
        toast.success('Unit updated');
      } else {
        await createUnit(selectedProperty.id, unitForm);
        toast.success('Unit created');
      }
      setIsUnitModalOpen(false);
      fetchUnits(selectedProperty.id);
    } catch (err) {
      toast.error(err.friendlyMessage || 'An error occurred');
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter ? p.property_type === typeFilter : true;
    return matchesSearch && matchesType;
  });

  if (activeView === 'detail' && selectedProperty) {
    const totalUnits = units.length;
    const availableUnits = units.filter(u => u.status === 'available').length;
    const occupiedUnits = units.filter(u => u.status === 'occupied').length;
    const maintenanceUnits = units.filter(u => u.status === 'under_maintenance').length;

    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header__left">
            <h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setActiveView('list')} style={{marginRight: '8px'}}>←</button>
              {selectedProperty.name}
            </h2>
            <div className="page-header__subtitle">
              {selectedProperty.address_line1}, {selectedProperty.city}
            </div>
          </div>
          {isAdminOrLandlord && (
            <button className="btn btn--primary" onClick={() => openUnitModal()}>+ Add Unit</button>
          )}
        </div>

        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div className="stat-card card"><div className="stat-card__label">Total Units</div><div className="stat-card__value">{totalUnits}</div></div>
          <div className="stat-card card"><div className="stat-card__label">Available</div><div className="stat-card__value" style={{color: 'var(--color-success)'}}>{availableUnits}</div></div>
          <div className="stat-card card"><div className="stat-card__label">Occupied</div><div className="stat-card__value" style={{color: 'var(--color-info)'}}>{occupiedUnits}</div></div>
          <div className="stat-card card"><div className="stat-card__label">Maintenance</div><div className="stat-card__value" style={{color: 'var(--color-warning)'}}>{maintenanceUnits}</div></div>
        </div>

        {loading ? <div style={{textAlign: 'center'}}><span className="spinner" /></div> : (
          units.length === 0 ? (
            <EmptyState icon="🏢" title="No Units" description="This property has no units yet." action={isAdminOrLandlord ? { label: 'Add Unit', onClick: () => openUnitModal() } : null} />
          ) : (
            <div className="units-grid">
              {units.map(unit => (
                <div key={unit.id} className={`unit-card unit-card--${unit.status}`}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div className="unit-card__number">{unit.unit_number}</div>
                    <StatusBadge value={unit.status} />
                  </div>
                  <div className="unit-card__rent">KES {parseFloat(unit.monthly_rent).toLocaleString()}</div>
                  <div className="unit-card__meta">
                    {unit.bedrooms} Bed • {unit.bathrooms} Bath {unit.size_sqm && `• ${unit.size_sqm} sqm`}
                  </div>
                  {isAdminOrLandlord && (
                    <div className="unit-card__actions">
                      <button className="btn btn--sm btn--outline" onClick={() => openUnitModal(unit)}>Edit</button>
                      <select 
                        className="form-control" 
                        style={{padding: '4px', fontSize: '12px'}}
                        value={unit.status}
                        onChange={(e) => {
                          updateUnitStatus(selectedProperty.id, unit.id, e.target.value)
                            .then(() => { toast.success('Status updated'); fetchUnits(selectedProperty.id); })
                            .catch(err => toast.error(err.friendlyMessage));
                        }}
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="under_maintenance">Maintenance</option>
                        <option value="reserved">Reserved</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title={editingUnit ? "Edit Unit" : "Add Unit"}>
          <form onSubmit={handleUnitSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Unit Number</label>
                <input required className="form-control" value={unitForm.unit_number} onChange={e => setUnitForm({...unitForm, unit_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input className="form-control" value={unitForm.floor_number} onChange={e => setUnitForm({...unitForm, floor_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Bedrooms</label>
                <input required type="number" min="0" max="10" className="form-control" value={unitForm.bedrooms} onChange={e => setUnitForm({...unitForm, bedrooms: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Bathrooms</label>
                <input required type="number" min="0" step="0.5" className="form-control" value={unitForm.bathrooms} onChange={e => setUnitForm({...unitForm, bathrooms: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Rent (KES)</label>
                <input required type="number" min="0" className="form-control" value={unitForm.monthly_rent} onChange={e => setUnitForm({...unitForm, monthly_rent: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Security Deposit (KES)</label>
                <input required type="number" min="0" className="form-control" value={unitForm.security_deposit} onChange={e => setUnitForm({...unitForm, security_deposit: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Size (sqm)</label>
                <input type="number" min="0" className="form-control" value={unitForm.size_sqm} onChange={e => setUnitForm({...unitForm, size_sqm: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={unitForm.status} onChange={e => setUnitForm({...unitForm, status: e.target.value})}>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="2" value={unitForm.description} onChange={e => setUnitForm({...unitForm, description: e.target.value})}></textarea>
              </div>
            </div>
            <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header__left">
          <h2>Properties</h2>
          <div className="page-header__subtitle">Manage your rental portfolio</div>
        </div>
        {isAdminOrLandlord && (
          <button className="btn btn--primary" onClick={() => openPropertyModal()}>+ Add Property</button>
        )}
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <span className="filter-bar__search-icon">🔍</span>
          <input 
            className="form-control search-input" 
            placeholder="Search by name or city..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="Apartment">Apartment</option>
          <option value="House">House</option>
          <option value="Commercial">Commercial</option>
          <option value="Bedsitter">Bedsitter</option>
          <option value="Studio">Studio</option>
        </select>
      </div>

      {loading ? <div style={{textAlign: 'center'}}><span className="spinner" /></div> : (
        filteredProperties.length === 0 ? (
          <EmptyState icon="🏢" title="No Properties Found" description="Add your first property to get started." action={isAdminOrLandlord ? { label: 'Add Property', onClick: () => openPropertyModal() } : null} />
        ) : (
          <div className="units-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'}}>
            {filteredProperties.map(prop => (
              <div key={prop.id} className="card unit-card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <h3 style={{margin: 0}}>{prop.name}</h3>
                  <StatusBadge value={prop.property_type} type="neutral" />
                </div>
                <div style={{color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '8px 0'}}>
                  {prop.city}, {prop.county}
                </div>
                <div style={{fontSize: 'var(--font-size-sm)', marginBottom: '16px'}}>
                  {prop.address_line1}
                </div>
                <div className="unit-card__actions" style={{justifyContent: 'space-between'}}>
                  <button className="btn btn--primary btn--sm" onClick={() => viewUnits(prop)}>Manage Units</button>
                  {isAdminOrLandlord && (
                    <div style={{display: 'flex', gap: '4px'}}>
                      <button className="btn btn--outline btn--sm" onClick={() => openPropertyModal(prop)}>Edit</button>
                      <button className="btn btn--danger btn--sm" onClick={() => { setPropertyToDelete(prop); setIsDeleteConfirmOpen(true); }}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} title={editingProperty ? "Edit Property" : "Add Property"} size="wide">
        <form onSubmit={handlePropertySubmit}>
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label className="form-label">Property Name</label>
              <input required className="form-control" value={propertyForm.name} onChange={e => setPropertyForm({...propertyForm, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={propertyForm.property_type} onChange={e => setPropertyForm({...propertyForm, property_type: e.target.value})}>
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Commercial">Commercial</option>
                <option value="Bedsitter">Bedsitter</option>
                <option value="Studio">Studio</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input required className="form-control" value={propertyForm.city} onChange={e => setPropertyForm({...propertyForm, city: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">County</label>
              <input required className="form-control" value={propertyForm.county} onChange={e => setPropertyForm({...propertyForm, county: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input className="form-control" value={propertyForm.postal_code} onChange={e => setPropertyForm({...propertyForm, postal_code: e.target.value})} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Address Line 1</label>
              <input required className="form-control" value={propertyForm.address_line1} onChange={e => setPropertyForm({...propertyForm, address_line1: e.target.value})} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Address Line 2</label>
              <input className="form-control" value={propertyForm.address_line2} onChange={e => setPropertyForm({...propertyForm, address_line2: e.target.value})} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="3" value={propertyForm.description} onChange={e => setPropertyForm({...propertyForm, description: e.target.value})}></textarea>
            </div>
          </div>
          <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
            <button type="submit" className="btn btn--primary">Save Property</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProperty}
        title="Delete Property"
        message={`Are you sure you want to delete ${propertyToDelete?.name}? This action cannot be undone.`}
      />
    </div>
  );
}
